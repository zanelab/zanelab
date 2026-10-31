/*
 * iam-web http 兼容封装（独立运行环境兜底）。
 *
 * 集成态：透传宿主 props.http（RequestClient 只读代理，拦截器含解包/token/notify）。
 * 独立态：用 @zanelab/utils RequestClient + 最小拦截器链自建（Accept-Language +
 * envelope 解包 + 401 跳登录页）。
 *
 * 业务层只 import 本模块的 post / onLoginSuccess，无 props 分支。
 */
import { defaultResponseInterceptor, RequestClient } from '@zanelab/utils';
import { getProps, type HostHttpClient } from '../main';

const STANDALONE_TOKEN_KEY = 'portal_token';
const STANDALONE_REFRESH_KEY = 'portal_refresh_token';

let localHttp: HostHttpClient | null = null;

/** 独立态本地客户端（幂等）：最小拦截器——解包 envelope + 401 跳 /login。 */
function getLocalHttp(): HostHttpClient {
  if (localHttp) return localHttp;
  const props = getProps();
  const client = new RequestClient({
    responseReturn: 'data',
  });
  client.addRequestInterceptor({
    fulfilled: (config) => {
      // 语言对齐宿主/独立态偏好（子应用无本地语言真相源）
      const locale = (props.preferences?.locale as string) ?? 'zh-CN';
      config.headers.set('Accept-Language', locale);
      // 独立态如有本地会话 token 一并注入（与 onLoginSuccess 持久化对齐）
      try {
        const token = localStorage.getItem(STANDALONE_TOKEN_KEY);
        if (token) {
          config.headers.set('Authorization', `Bearer ${token}`);
        }
      } catch {
        /* localStorage 不可用则跳过 */
      }
      return config;
    },
  });
  client.addResponseInterceptor(defaultResponseInterceptor({}));
  client.addResponseInterceptor({
    fulfilled: (response) => response,
    rejected: (error) => {
      if (error?.response?.status === 401) {
        window.location.replace('/login');
      }
      return Promise.reject(error);
    },
  });
  localHttp = client as unknown as HostHttpClient;
  return localHttp;
}

export async function post(path: string, body?: unknown): Promise<unknown> {
  const hostHttp = getProps().http as HostHttpClient | undefined;
  if (typeof hostHttp?.post === 'function') {
    return hostHttp.post(path, body);
  }
  return getLocalHttp().post(path, body);
}

/** 会话回传兼容：集成态交还宿主 bootstrapSession；独立态本地跳转 */
export async function onLoginSuccess(params: {
  token: string;
  refreshToken?: string;
  user?: { id?: number | string; username?: string };
}): Promise<void> {
  const props = getProps();
  if (typeof props.onLoginSuccess === 'function') {
    await props.onLoginSuccess(params);
    return;
  }
  try {
    localStorage.setItem(STANDALONE_TOKEN_KEY, params.token);
    if (params.refreshToken) {
      localStorage.setItem(STANDALONE_REFRESH_KEY, params.refreshToken);
    }
  } catch {
    /* localStorage 不可用不阻断 */
  }
  window.history.pushState({}, '', '/home');
  window.dispatchEvent(new PopStateEvent('popstate'));
}
