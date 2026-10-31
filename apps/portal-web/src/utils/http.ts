/*
 * portal http 组装层（vben request-client 模式，见任务 10-29-vben-request-client design §2.4）：
 *
 *   new RequestClient → 请求拦截器（token/legacy headers）→ 解包 → portal 业务
 *   → 认证（401 单飞刷新重放）→ 错误提示（403/5xx notify）
 *
 * 响应链顺序即语义（design §3 数据流）：
 * - defaultResponseInterceptor：2xx envelope 成功 → data；envelope 失败/HTTP 错误 → 携带 response 抛出
 * - portalBizInterceptor（rejected）：解包层错误转 BizCodeError{bizCode}（不附 response——
 *   RequestClient.request 对带 response 的错误会改抛 response.data，附上会丢失错误类型）；
 *   reLogin 码/msg 正则 → notify + handleLogout；其余 envelope 失败 → biz 码 i18n notify；
 *   HTTP 层错误原样放行（401 交给认证拦截器，403/5xx 交给错误提示拦截器）
 * - authenticateResponseInterceptor：HTTP 401 单飞刷新（fetch 实现，Out of Scope 不变），
 *   重放写 TOKEN_HEADER；刷新失败 → handleLogout + reject BizCodeError('401')（保持
 *   isSessionExpiredError 语义，micro/register.ts 消费）
 * - errorMessageResponseInterceptor：403/5xx + 网络/超时 notify（保持旧 error
 *   分支行为：403 forbidden、5xx serverError、无 response 的断网/超时提示
 *   networkError；其它状态码不提示）
 */
import axios from 'axios';
import {
  authenticateResponseInterceptor,
  defaultResponseInterceptor,
  errorMessageResponseInterceptor,
  isSessionExpiredError,
  notify,
  RequestClient,
} from '@zanelab/utils';
import type {
  BizCodeError as BizCodeErrorType,
  RequestClientOptions,
  ResponseInterceptorConfig,
} from '@zanelab/utils';
import { appConfig } from '../config';
import i18n from '../locales/i18n';
import { useAuthStore } from '../stores/auth-store';
import { handleLogout } from './auth';
import { buildLegacyHeaders } from './session-headers';
import { TOKEN_HEADER } from '../constants/auth';

// ==================== 业务策略（portal 特定） ====================

/** 旧格式兼容：为保持导出签名不变，重新导出共享类型 */
export type { BizCodeErrorType as BizCodeError };
export { isSessionExpiredError };

const SUCCESS_CODES: (string | number)[] = [0, '0', '10000'];
function isSuccessCode(code: unknown): boolean {
  return SUCCESS_CODES.includes(code as string | number);
}

const bizErrorKeys: Record<number, string> = {
  10001: 'common.http.biz10001',
  10002: 'common.http.biz10002',
  213004: 'common.http.sessionExpired',
  40100: 'common.http.sessionExpired',
  213005: 'common.http.sessionTimeout',
};

const RE_LOGIN_CODES: string[] = ['213004', '40100', '213005'];
const RE_LOGIN_STATUS_CODES: string[] = ['213004', '40100', '213005'];
const SESSION_EXPIRED_MSG_PATTERN =
  /未登录|登录已失效|登录过期|会话超时|登录超时|not logged|session expired|session timed out/i;

function isReLoginCode(code: unknown): boolean {
  return (
    code !== undefined && code !== null && RE_LOGIN_CODES.includes(String(code))
  );
}

function isSessionExpiredMessage(msg?: string): boolean {
  return !!msg && SESSION_EXPIRED_MSG_PATTERN.test(msg);
}

function isSessionExpired(
  code: unknown,
  msg?: string,
  httpStatus?: number,
): boolean {
  if (isReLoginCode(code)) return true;
  if (
    httpStatus !== undefined &&
    RE_LOGIN_STATUS_CODES.includes(String(httpStatus))
  )
    return true;
  if (isSessionExpiredMessage(msg)) return true;
  return false;
}

function onBizError(code: unknown, msg?: string): boolean {
  const numericCode =
    typeof code === 'string' ? parseInt(code, 10) : Number(code);
  const mappedKey = bizErrorKeys[numericCode];
  const errorMsg = mappedKey
    ? i18n.t(mappedKey)
    : (msg ?? i18n.t('common.http.requestFailed'));
  notify.error(errorMsg);
  return true;
}

function onSessionExpired(code: unknown, backendMsg?: string) {
  // 文案映射对齐旧 rejectSessionExpired：业务码命中映射表用映射文案
  // （213004/40100 → sessionExpired、213005 → sessionTimeout），
  // 文案兜底命中的未知码回落 sessionExpired，再兜底后端原文。
  const numericCode =
    typeof code === 'string' ? parseInt(code, 10) : Number(code);
  const mappedKey =
    code !== undefined && code !== null ? bizErrorKeys[numericCode] : undefined;
  const errorMsg = mappedKey
    ? i18n.t(mappedKey)
    : (backendMsg ?? i18n.t('common.http.sessionExpired'));
  notify.error(errorMsg);
  handleLogout();
}

async function refreshToken(): Promise<string> {
  const refreshTokenValue = localStorage.getItem(
    appConfig.auth.refreshTokenKey,
  );
  if (!appConfig.api.refreshEndpoint || !refreshTokenValue) {
    throw new Error('no refresh token');
  }
  const res = await fetch(
    `${appConfig.api.baseURL}${appConfig.api.refreshEndpoint}`,
    {
      method: 'POST',
      headers: {
        ...buildLegacyHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    },
  );
  const body = (await res.json()) as {
    code: number | string;
    data: { token: string };
    msg?: string;
    message?: string;
  };
  if (!isSuccessCode(body.code) || !body.data?.token) {
    throw new Error(
      body.msg ?? body.message ?? i18n.t('common.http.refreshFailed'),
    );
  }
  return body.data.token;
}

function onTokenRefreshed(token: string) {
  localStorage.setItem(appConfig.auth.tokenKey, token);
  useAuthStore.getState().setToken(token);
}

// ==================== 拦截器组装 ====================

interface EnvelopeBody {
  code?: unknown;
  data?: unknown;
  msg?: string;
  message?: string;
}

function isEnvelopeBody(body: unknown): body is EnvelopeBody {
  return !!body && typeof body === 'object' && 'code' in body;
}

/** 旧 createHttpClient 同款 reject 形态：BizCodeError{bizCode}（不附 response，见文件头注释） */
function bizError(code: unknown, msg?: string): BizCodeErrorType {
  return Object.assign(new Error(msg ?? '请求失败'), {
    bizCode: code as string | number | undefined,
  });
}

/**
 * portal 业务 rejected 拦截器（插在解包之后、认证之前）：
 * - 解包层抛出的 envelope 失败（2xx）→ BizCodeError + biz/session 通知
 * - HTTP 层错误中 envelope 命中 reLogin 码/msg 正则 → onSessionExpired + BizCodeError
 * - 其余 HTTP 层错误原样放行（401 → 认证拦截器；403/5xx → 错误提示拦截器）
 */
const portalBizInterceptor: ResponseInterceptorConfig = {
  fulfilled: (response) => response,
  rejected: (error) => {
    if (axios.isAxiosError(error)) {
      // HTTP 层错误（旧 createHttpClient error 分支语义）
      const body = error.response?.data;
      if (isEnvelopeBody(body)) {
        const msg = body.msg ?? body.message;
        if (isSessionExpired(body.code, msg, error.response?.status)) {
          onSessionExpired(body.code ?? error.response?.status, msg);
          return Promise.reject(
            bizError(body.code ?? error.response?.status, msg),
          );
        }
      }
      return Promise.reject(error);
    }

    // 解包层（defaultResponseInterceptor.fulfilled）抛出的 2xx envelope 失败
    // —— plain object 携带 response（旧 createHttpClient success 分支语义）
    const body = (error as { response?: { data?: unknown } })?.response?.data;
    if (isEnvelopeBody(body)) {
      const msg = body.msg ?? body.message;
      if (isSessionExpired(body.code, msg)) {
        onSessionExpired(body.code, msg);
        return Promise.reject(bizError(body.code, msg));
      }
      onBizError(body.code, msg);
      return Promise.reject(bizError(body.code, msg));
    }
    return Promise.reject(error);
  },
};

function createRequestClient(
  baseURL: string,
  options?: RequestClientOptions,
): RequestClient {
  const client = new RequestClient({
    baseURL,
    withCredentials: true,
    timeout: 60_000, // 保持现行 portal 超时（vben 默认 10s 不适用旧后端）
    ...options,
  });

  // 请求拦截器：raw token 注入 TOKEN_HEADER（token 非空才 set——保持 auth.ts
  // logout fire-and-forget 特例可用）+ legacy headers（含 x-lang/端标识）
  client.addRequestInterceptor({
    fulfilled: (config) => {
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.set(TOKEN_HEADER, token);
      }
      const extraHeaders = buildLegacyHeaders();
      for (const [key, value] of Object.entries(extraHeaders)) {
        config.headers.set(key, value);
      }
      return config;
    },
  });

  // 响应链（顺序即语义）：解包 → portal 业务 → 认证（401 单飞）→ 错误提示
  client.addResponseInterceptor(
    defaultResponseInterceptor({
      successCode: isSuccessCode,
      dataField: 'data',
    }),
  );
  client.addResponseInterceptor(portalBizInterceptor);
  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate: async () => {
        handleLogout();
      },
      doRefreshToken: async () => {
        try {
          const token = await refreshToken();
          onTokenRefreshed(token);
          return token;
        } catch (e) {
          // 刷新失败 → BizCodeError('401')：保持 isSessionExpiredError 对
          // 刷新失败错误的判定语义（micro/register.ts restoreSession 消费）
          throw Object.assign(
            new Error((e as Error | undefined)?.message ?? '登录态已失效'),
            { bizCode: '401' as const },
          );
        }
      },
      enableRefreshToken: true,
      formatToken: (t) => t,
      tokenHeaderName: TOKEN_HEADER,
    }),
  );
  client.addResponseInterceptor(
    errorMessageResponseInterceptor(
      (msg) => {
        if (msg) notify.error(msg);
      },
      {
        // HTTP 状态：仅 403/5xx 提示（旧 error 分支行为）；null = 该状态不提示
        resolveStatusMessage: (status) => {
          if (status === 403) return i18n.t('common.http.forbidden');
          if (status !== undefined && status >= 500)
            return i18n.t('common.http.serverError');
          return null;
        },
        // 网络/超时：保持旧分支行为——断网提示「网络连接异常」（超时旧实现走
        // 无 response 分支同款文案；backend 超时码另有 408 映射，此处是传输层超时）
        resolveNetworkMessage: (kind) =>
          kind === 'network'
            ? i18n.t('common.http.networkError')
            : i18n.t('common.http.networkError'),
      },
    ),
  );

  return client;
}

// ==================== 导出 ====================

/** 业务请求客户端：envelope 解包到 data，请求函数直接拿到 Promise<T> */
export const requestClient = createRequestClient(appConfig.api.baseURL, {
  responseReturn: 'data',
});

/** 裸客户端：responseReturn 'raw'，返回原始 AxiosResponse（供刷新等特殊场景） */
export const baseRequestClient = createRequestClient(appConfig.api.baseURL);

declare global {
  interface Window {
    /** 宿主共享 http 通道：RequestClient 只读代理（子应用经 props.http 消费） */
    __http?: unknown;
  }
}

// 只读代理（子应用侧 window.__http）：挡 interceptors 与 instance 双路径，
// 防止子应用改拦截器或绕过约束摸原始 axios 实例（D2 通道对象 = RequestClient）
const httpProxy = new Proxy(requestClient, {
  get(target, prop, receiver) {
    if (prop === 'interceptors' || prop === 'instance') return undefined;
    return Reflect.get(target, prop, receiver);
  },
});
window.__http = httpProxy;

export default requestClient;
