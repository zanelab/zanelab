/*
 * iam-web 认证域 api —— `/functions/v1` 调用的唯一落点。
 *
 * 形态参照 apps/portal-web/src/api/auth.ts：按域一个命名空间对象，层内完成
 * URL 拼装、入参整形、响应归一化与错误语义；页面只拿领域对象，不见 envelope。
 * 新增 `/functions/v1` 调用一律在此层按域建文件，路径常量进 api/endpoints.ts。
 *
 * 前缀：集成态从 props.basename（= activeRule '/iam'）派生，独立态（props 缺省）
 * 为空 —— 请求直落本 dev server，不打死不存在的宿主路径（独立运行性硬约定）。
 */
import { getProps } from '../main';
import { post } from '../utils/http';
import { OTP_SEND_PATH, OTP_VERIFY_PATH } from './endpoints';

/** 登录会话（领域对象：envelope / 解包后的 data 形态差异在本层收敛）。 */
export interface LoginSession {
  token: string;
  refreshToken?: string;
  user?: { id?: number | string; username?: string; email?: string };
}

/** 发码返回体（双形态：拦截器已解包的 data / 未解包的 envelope）。 */
interface OtpSendPayload {
  success?: boolean;
  msg?: string;
  data?: { success?: boolean };
}

/** 验码返回体（同上双形态）。 */
interface OtpVerifyPayload {
  token?: string;
  refreshToken?: string;
  user?: LoginSession['user'];
  msg?: string;
  data?: {
    token?: string;
    refreshToken?: string;
    user?: LoginSession['user'];
  };
}

/** 集成态 basename('/iam') → 代理前缀 '/iam'；独立态（缺省）→ ''（不重复剥前缀）。 */
function apiPrefix(): string {
  return (getProps().basename as string | undefined)?.replace(/\/$/, '') ?? '';
}

/**
 * 双形态读值（解包优先，envelope 兜底）：宿主/本地拦截器成功时已解包 envelope
 * 返回 `body.data`（`{ success }` / `{ token, ... }`），未解包路径返回原 envelope
 * `{ code, data, msg }`。两者都容忍，收敛在此单一助手，调用方不见形态差异。
 */
function normalize<T>(res: unknown): T | undefined {
  return ((res as { data?: T } | undefined)?.data ?? res) as T | undefined;
}

/**
 * 后端文案提取（四级顺序，对齐传输层实际抛出形态）：
 * AxiosError（HTTP 非 2xx）→ 2xx 但 envelope code!==0（解包层抛
 * `{ ...response, response }`）→ 普通 Error（网络/超时）→ 取不到 undefined。
 */
function extractMsg(error: unknown): string | undefined {
  const e = error as
    | {
        response?: { data?: { msg?: string } };
        data?: { msg?: string };
        message?: string;
      }
    | undefined;
  return e?.response?.data?.msg ?? e?.data?.msg ?? e?.message ?? undefined;
}

/** 失败统一上抛：Error(msg)；msg 取不到 → 无 message 的 Error（页面落 i18n 兜底）。 */
function toError(error: unknown): Error {
  return new Error(extractMsg(error));
}

export const authApi = {
  /**
   * 发码：POST {prefix}/functions/v1/iam/auth/otp/send，body { email }。
   *
   * 成功判定 = `success === true`（未解包 envelope 的 `data.success` 兜底）；
   * 成功无返回值，失败 `throw Error(msg)`。
   */
  async sendOtp(email: string): Promise<void> {
    let res: unknown;
    try {
      res = await post(`${apiPrefix()}${OTP_SEND_PATH}`, { email });
    } catch (e) {
      throw toError(e);
    }
    const data = normalize<OtpSendPayload>(res);
    if (data?.success === true || data?.data?.success === true) return;
    // 2xx 但未命中成功判定：body 非 envelope（无 code 字段）时拦截器原样放行，
    // 文案取归一化 body 的 msg
    throw new Error(data?.msg);
  },

  /**
   * 验码：POST {prefix}/functions/v1/iam/auth/otp/verify，body { email, code }。
   *
   * 成功判定 = `token` 非空，返回领域对象 LoginSession；失败 `throw Error(msg)`。
   */
  async verifyOtp(email: string, code: string): Promise<LoginSession> {
    let res: unknown;
    try {
      res = await post(`${apiPrefix()}${OTP_VERIFY_PATH}`, { email, code });
    } catch (e) {
      throw toError(e);
    }
    const data = normalize<OtpVerifyPayload>(res);
    // 取数：解包形态取本体（含 token），未解包 envelope 取 data.data
    const payload = data?.token ? data : data?.data;
    if (payload?.token) {
      return {
        token: payload.token,
        refreshToken: payload.refreshToken,
        user: payload.user,
      };
    }
    throw new Error(data?.msg);
  },
};
