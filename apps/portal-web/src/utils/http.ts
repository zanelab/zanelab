import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { appConfig } from '../config';
import i18n from '../locales/i18n';
import { useAuthStore } from '../stores/auth-store';
import { notify } from '@zanelab/utils';
import { handleLogout } from './auth';
import { buildLegacyHeaders } from './session-headers';
import { TOKEN_HEADER } from '../constants/auth';

// 统一 Axios 实例（docs/技术方案.md §8.1）：业务代码不另建 axios.create()。
export interface ApiEnvelope<T = unknown> {
  code: number | string;
  data: T;
  msg?: string;
  /** 旧后端用 message 而非 msg */
  message?: string;
  /** 旧后端额外字段 */
  success?: boolean;
}

// 业务错误码 → 语言包 key 映射（§8.1），后端码表就绪后可扩展。
// 拦截器为非 React 上下文，文案经 i18n.t 直调（09-09-i18n design §3）。
const bizErrorKeys: Record<number, string> = {
  10001: 'common.http.biz10001',
  10002: 'common.http.biz10002',
  // 登录态失效（迁移自旧项目 constants/network.ts 的 ERROR_MESSAGE_MAP）：
  // 213004/40100 = 系统未登录，213005 = 系统超时
  213004: 'common.http.sessionExpired',
  40100: 'common.http.sessionExpired',
  213005: 'common.http.sessionTimeout',
};

// ── 登录态失效判定（迁移自旧项目 app.ts responseInterceptors）──────────────
// 旧项目对这些码的处理：清 token/userInfo 后跳登录页（213004/40100 未登录、
// 213005 超时）。'401' 是内部伪码：HTTP 401 且刷新失败（非后端业务码）。
const RE_LOGIN_CODES: string[] = ['213004', '40100', '213005', '401'];

function isReLoginCode(code: unknown): boolean {
  return (
    code !== undefined && code !== null && RE_LOGIN_CODES.includes(String(code))
  );
}

/** 携带后端业务码的错误（bizCode 供调用方判定登录态失效，如 restoreSession） */
export interface BizCodeError extends Error {
  bizCode?: string | number;
}

/**
 * 是否「登录态失效」错误：业务码命中 RE_LOGIN_CODES，或 HTTP 401（含刷新失败
 * 链路——那条路径 reject 的是 refreshError，故上面额外打了 '401' 伪码）。
 *
 * 用途：启动期链路（restoreSession）在 React 挂载前拿不到 global-logout 事件，
 * 需要据此自行兜底整页跳登录页。
 */
export function isSessionExpiredError(error: unknown): boolean {
  const bizCode = (error as BizCodeError | undefined)?.bizCode;
  if (isReLoginCode(bizCode)) return true;
  return (error as AxiosError | undefined)?.response?.status === 401;
}

/**
 * HTTP 状态码形态的登录态失效码（不含内部伪码 '401'）。
 *
 * 注：HTTP 状态码是三位数，213004/40100 这类五位业务码只可能出现在响应体里
 * （错误分支已按「错误体 code」判定）；此处保留三位数形态用于兼容网关自定义码。
 * 真实 401 不在此列——它仍走「刷新 token 重试」流程。
 */
const RE_LOGIN_STATUS_CODES: string[] = ['213004', '40100', '213005'];

/**
 * 文案兜底判定：业务码不在 RE_LOGIN_CODES 内、但 message 明确是未登录/会话
 * 失效时，同样按登录态失效处理（后端码表未收敛时的保险）。
 */
const SESSION_EXPIRED_MSG_PATTERN =
  /未登录|登录已失效|登录过期|会话超时|登录超时|not logged|session expired|session timed out/i;

function isSessionExpiredMessage(message?: string): boolean {
  return !!message && SESSION_EXPIRED_MSG_PATTERN.test(message);
}

/** 登录态失效的标记码：命中判定但业务码未知/非标准时用它标记，供调用方识别 */
const SESSION_EXPIRED_MARKER = '401';

/**
 * 登录态失效统一处理：notify + 清态登出。
 *
 * handleLogout 会清 token/store 并广播 global-logout → App 顶层
 * watchGlobalLogout 跳登录页（与 401 刷新失败同一链路）；reject 的错误带
 * 上业务码，供启动期链路（restoreSession，此时 React 尚未挂载、事件无人接收）
 * 兜底整页跳登录页。
 */
function rejectSessionExpired(
  code: string | number | undefined,
  backendMsg?: string,
) {
  const mapped = code === undefined ? undefined : bizErrorKeys[Number(code)];
  const errorMsg = mapped
    ? i18n.t(mapped)
    : (backendMsg ?? i18n.t('common.http.sessionExpired'));
  notify.error(errorMsg);
  handleLogout();
  const bizError: BizCodeError = new Error(errorMsg);
  // 命中来自文案兜底（业务码未知）时，用标记码保证 isSessionExpiredError 可识别
  bizError.bizCode =
    code !== undefined && isReLoginCode(code) ? code : SESSION_EXPIRED_MARKER;
  return Promise.reject(bizError);
}

// 成功码：新格式 code===0（number），旧格式 code==="10000"（string）
const SUCCESS_CODES: (string | number)[] = [0, '0', '10000'];
function isSuccessCode(code: unknown): boolean {
  return SUCCESS_CODES.includes(code as string | number);
}

const service = axios.create({
  baseURL: appConfig.api.baseURL,
  timeout: 60000,
  withCredentials: true,
});

// 请求拦截器：token 从 store 读取（store 才是权威，见 spec/http-api-guidelines.md）。
// 旧后端用 TOKEN_HEADER 头（raw token，无 Bearer 前缀），与旧项目 TOKEN_KEY 对齐。
// 同时带 x-lang / X-Platform / X-Tenant 等旧项目兼容头（见 session-headers.ts）。
service.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  const headers = buildLegacyHeaders();
  if (token) {
    headers[TOKEN_HEADER] = token;
  }
  // 合并到 config.headers（保留已有自定义头）
  for (const [key, value] of Object.entries(headers)) {
    config.headers.set(key, value);
  }
  return config;
});

// ── 401 单飞刷新（§5.2）────────────────────────────────────────────
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function refreshToken(): Promise<string> {
  const refreshTokenValue = localStorage.getItem(
    appConfig.auth.refreshTokenKey,
  );
  if (!appConfig.api.refreshEndpoint || !refreshTokenValue) {
    throw new Error('no refresh token');
  }
  const refreshHeaders = buildLegacyHeaders();
  const res = await axios.post<{
    code: number | string;
    data: { token: string };
    msg?: string;
    message?: string;
  }>(
    `${appConfig.api.baseURL}${appConfig.api.refreshEndpoint}`,
    { refreshToken: refreshTokenValue },
    { headers: refreshHeaders },
  );
  const body = res.data;
  if (!isSuccessCode(body.code) || !body.data?.token) {
    throw new Error(
      body.msg ?? body.message ?? i18n.t('common.http.refreshFailed'),
    );
  }
  return body.data.token;
}

// 响应拦截器（§8.1）：解包 { code, data, msg/message }，业务错误/HTTP 错误统一 notify。
// 兼容两种后端格式：
//   新格式 { code: 0, data, msg }          — code 为数字，0=成功
//   旧格式 { code: "10000", data, message } — code 为字符串，"10000"=成功
service.interceptors.response.use(
  (response: AxiosResponse) => {
    const body = response.data as ApiEnvelope | undefined;
    if (body && typeof body === 'object' && 'code' in body) {
      if (!isSuccessCode(body.code)) {
        const numericCode =
          typeof body.code === 'string' ? parseInt(body.code, 10) : body.code;
        const mappedKey = bizErrorKeys[numericCode as number];
        const errorMsg = mappedKey
          ? i18n.t(mappedKey)
          : (body.msg ?? body.message ?? i18n.t('common.http.requestFailed'));
        const backendMsg = body.msg ?? body.message;
        // 登录态失效（未登录 213004/40100、会话超时 213005，或文案明确是未登录/
        // 会话失效）→ 统一登出跳登录页（见 rejectSessionExpired）；
        // 其余业务码（如 10001 账密错误）只提示错误，不登出。
        if (isReLoginCode(body.code) || isSessionExpiredMessage(backendMsg)) {
          return rejectSessionExpired(
            body.code,
            backendMsg,
          ) as unknown as AxiosResponse;
        }
        notify.error(errorMsg);
        const bizError: BizCodeError = new Error(errorMsg);
        bizError.bizCode = body.code;
        return Promise.reject(bizError) as unknown as AxiosResponse;
      }

      // 成功 → 直接返回解包后的 data（业务层拿到即数据）。
      return body.data as unknown as AxiosResponse;
    }
    return response;
  },
  async (error: AxiosError<ApiEnvelope>) => {
    if (!error.response) {
      notify.error(i18n.t('common.http.networkError'));
      return Promise.reject(error);
    }
    const status = error.response.status;
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 已有刷新进行中：排队，新 token 到手后重放原请求。
        return new Promise<AxiosResponse>((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers[TOKEN_HEADER] = token;
            resolve(service(originalRequest));
          });
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const newToken = await refreshToken();
        localStorage.setItem(appConfig.auth.tokenKey, newToken);
        useAuthStore.getState().setToken(newToken);
        onRefreshed(newToken);
        originalRequest.headers[TOKEN_HEADER] = newToken;
        return service(originalRequest);
      } catch (refreshError) {
        handleLogout(); // 刷新失败 → 登出（不静默吞掉）
        // 打内部伪码 '401'：启动期链路（restoreSession）据此兜底整页跳登录页
        // ——此处 reject 的是 refreshError，调用方无法从 response.status 看出 401
        (refreshError as BizCodeError).bizCode = '401';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 登录态失效（非 2xx 形态）：网关可能把业务码当 HTTP 状态码返回
    // （status=213004/40100/213005），或错误体里带这些业务码——这两种都进不了
    // 上面的响应成功分支，需在此退出登录并跳登录页。
    // 放在 401 刷新流程之后：真实 401 仍先尝试刷新重试，不在本列。
    const errBody = error.response.data as ApiEnvelope | undefined;
    const errMsg = errBody?.msg ?? errBody?.message;
    const reLoginCode: string | number | null = isReLoginCode(errBody?.code)
      ? (errBody?.code as string | number)
      : RE_LOGIN_STATUS_CODES.includes(String(status))
        ? status
        : null;
    if (reLoginCode !== null || isSessionExpiredMessage(errMsg)) {
      return rejectSessionExpired(
        reLoginCode ?? undefined,
        errMsg,
      ) as unknown as AxiosResponse;
    }

    if (status === 403) {
      notify.error(i18n.t('common.http.forbidden'));
      // 可跳转 403 页（路由层依据 code/status 自行处理）
    } else if (status >= 500) {
      notify.error(i18n.t('common.http.serverError'));
    }
    return Promise.reject(error);
  },
);

// 只读共享实例（§8.1/§9.3）：子应用可用 window.__http，但不能改拦截器。
const httpProxy = new Proxy(service, {
  get(target, prop, receiver) {
    if (prop === 'interceptors') return undefined; // 只读：禁止修改拦截器
    return Reflect.get(target, prop, receiver);
  },
});

declare global {
  interface Window {
    __http: typeof httpProxy;
  }
}
window.__http = httpProxy;

// 内部使用统一实例；子应用侧用 window.__http。
export { httpProxy };
export default service;
