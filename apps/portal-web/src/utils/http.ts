import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { appConfig } from '../config';
import i18n from '../locales/i18n';
import { notify } from '@zanelab/utils';
import { handleLogout } from './auth';
import { supabase } from '../lib/supabase';

export interface ApiEnvelope<T = unknown> {
  code: number | string;
  data: T;
  msg?: string;

  message?: string;

  success?: boolean;
}

const bizErrorKeys: Record<number, string> = {
  10001: 'common.http.biz10001',
  10002: 'common.http.biz10002',

  213004: 'common.http.sessionExpired',
  40100: 'common.http.sessionExpired',
  213005: 'common.http.sessionTimeout',
};

const RE_LOGIN_CODES: string[] = ['213004', '40100', '213005', '401'];

function isReLoginCode(code: unknown): boolean {
  return (
    code !== undefined && code !== null && RE_LOGIN_CODES.includes(String(code))
  );
}

export interface BizCodeError extends Error {
  bizCode?: string | number;
}

export function isSessionExpiredError(error: unknown): boolean {
  const bizCode = (error as BizCodeError | undefined)?.bizCode;
  if (isReLoginCode(bizCode)) return true;
  return (error as AxiosError | undefined)?.response?.status === 401;
}

const SESSION_EXPIRED_MSG_PATTERN =
  /未登录|登录已失效|登录过期|会话超时|登录超时|not logged|session expired|session timed out/i;

function isSessionExpiredMessage(message?: string): boolean {
  return !!message && SESSION_EXPIRED_MSG_PATTERN.test(message);
}

const SESSION_EXPIRED_MARKER = '401';

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

  bizError.bizCode =
    code !== undefined && isReLoginCode(code) ? code : SESSION_EXPIRED_MARKER;
  return Promise.reject(bizError);
}

const SUCCESS_CODES: (string | number)[] = [0, '0', '10000'];
function isSuccessCode(code: unknown): boolean {
  return SUCCESS_CODES.includes(code as string | number);
}

const service = axios.create({
  baseURL: appConfig.api.baseURL,
  timeout: 60000,
  withCredentials: true,
});

service.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  return config;
});

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

    if (status === 401) {
      await supabase.auth.signOut();
      handleLogout();
      const bizError: BizCodeError = new Error(
        i18n.t('common.http.sessionExpired'),
      );
      bizError.bizCode = '401';
      return Promise.reject(bizError);
    }

    const errBody = error.response.data as ApiEnvelope | undefined;
    const errMsg = errBody?.msg ?? errBody?.message;
    if (isReLoginCode(errBody?.code) || isSessionExpiredMessage(errMsg)) {
      return rejectSessionExpired(
        errBody?.code,
        errMsg,
      ) as unknown as AxiosResponse;
    }

    if (status === 403) {
      notify.error(i18n.t('common.http.forbidden'));
    } else if (status >= 500) {
      notify.error(i18n.t('common.http.serverError'));
    }
    return Promise.reject(error);
  },
);

const httpProxy = new Proxy(service, {
  get(target, prop, receiver) {
    if (prop === 'interceptors') return undefined;
    return Reflect.get(target, receiver);
  },
});

declare global {
  interface Window {
    __http: typeof httpProxy;
  }
}
window.__http = httpProxy;

export { httpProxy };
export default service;
