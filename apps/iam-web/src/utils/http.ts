/*
 * iam-web http 兼容封装（独立运行环境兜底）。
 *
 * 集成态：透传宿主 props.http（RequestClient 只读代理，拦截器含解包/token/notify/401 单飞）。
 * 独立态：用 @zanelab/utils RequestClient + 最小拦截器链自建（x-client-info lang= +
 * apikey(.env 配置时) + Authorization Bearer + envelope 解包 + 401 单飞刷新重放——
 * 刷新数据源 = Edge Fn 的 POST /auth/refresh（GoTrue 会话轮换），刷新失败才跳登录页）。
 *
 * 业务层只 import 本模块的 post/get/put/del / onLoginSuccess，无 props 分支。
 */
import { defaultResponseInterceptor, RequestClient } from '@zanelab/utils';
import { getProps, type HostHttpClient } from '../props';

const STANDALONE_TOKEN_KEY = 'iam_token';
const STANDALONE_REFRESH_KEY = 'iam_refresh_token';

/** iam 独立态的刷新端点（Edge Fn，相对页面 origin；集成态不走此链路——
 *  宿主 props.http 的 401 由宿主拦截器单飞刷新） */
const REFRESH_PATH = '/functions/v1/iam/auth/refresh';

/** 集成态 API 前缀（与 api/auth.ts 的 apiPrefix 同源——刷新请求在集成态不走，但
 *  独立态直连云时 path 是相对路径直落本 origin，无需前缀；保留常量备用） */
let localHttp: HostHttpClient | null = null;

/** 401 单飞刷新的进行中标记（并发 401 只触发一次刷新，排队请求重放） */
let refreshing: Promise<void> | null = null;

/** 刷新 + 重放是否已宣告失败（失败后跳登录，重放不再尝试） */
function readToken(): string | null {
  try {
    return localStorage.getItem(STANDALONE_TOKEN_KEY);
  } catch {
    return null;
  }
}

function readRefreshToken(): string | null {
  try {
    return localStorage.getItem(STANDALONE_REFRESH_KEY);
  } catch {
    return null;
  }
}

function writeSession(token: string, refreshToken: string): void {
  try {
    localStorage.setItem(STANDALONE_TOKEN_KEY, token);
    localStorage.setItem(STANDALONE_REFRESH_KEY, refreshToken);
  } catch {
    /* localStorage 不可用不阻断 */
  }
}

/** 跳登录页（独立态路径；清掉已失效的凭据避免循环）。 */
function redirectToLogin(): void {
  try {
    localStorage.removeItem(STANDALONE_TOKEN_KEY);
    localStorage.removeItem(STANDALONE_REFRESH_KEY);
  } catch {
    /* 忽略 */
  }
  window.location.replace('/login');
}

/**
 * 单飞刷新：并发 401 共享同一次刷新请求；成功后调用重放，失败统一跳登录。
 * 刷新数据源 = Edge Fn POST /auth/refresh（GoTrue 轮换语义：refresh_token 一次性，
 * 响应的双 token 必须覆盖本地，否则下一次刷新必失败）。
 */
async function refreshAndReplay(
  replay: () => Promise<unknown>,
): Promise<unknown> {
  refreshing ??= (async () => {
    const refreshToken = readRefreshToken();
    if (!refreshToken) {
      redirectToLogin();
      throw new Error('no refresh token');
    }
    try {
      const res = await fetch(REFRESH_PATH, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const body = (await res.json()) as {
        code: number;
        data: { token: string; refreshToken: string } | null;
        msg?: string;
      };
      if (!res.ok || body.code !== 0 || !body.data?.token) {
        throw new Error(body.msg ?? 'refresh failed');
      }
      // GoTrue 轮换：双 token 都换新，必须一起覆盖
      writeSession(body.data.token, body.data.refreshToken);
    } catch (e) {
      redirectToLogin();
      throw e instanceof Error ? e : new Error('refresh failed');
    }
  })();

  try {
    await refreshing;
    return await replay();
  } finally {
    refreshing = null;
  }
}

/** 独立态本地客户端（幂等）：解包 envelope + Authorization Bearer + 401 单飞刷新。 */
function getLocalHttp(): HostHttpClient {
  if (localHttp) return localHttp;
  const props = getProps();
  const client = new RequestClient({
    responseReturn: 'data',
  });
  client.addRequestInterceptor({
    fulfilled: (config) => {
      // 语言对齐宿主/独立态偏好（子应用无本地语言真相源）。封装进 x-client-info
      // （网关白名单内）：Accept-Language 显式 set 会进 CORS 预检 Request-Headers
      // 被 Supabase 网关拒绝（白名单固定无它，2026-11-10 线上实测）；edge fn
      // detectLang 解析 lang= 字段，/zh/i 检测两种格式都命中
      const locale = (props.preferences?.locale as string) ?? 'zh-CN';
      config.headers.set('x-client-info', `lang=${locale.replace('-', '_')}`);
      // 独立态直连云 Supabase 时需 publishable key（.env 配了才注入；本地
      // supabase start 无鉴权可不填）。集成态由宿主 dev proxy 注入，不走此分支。
      const apiKey = import.meta.env.VITE_API_KEY as string | undefined;
      if (apiKey) {
        config.headers.set('apikey', apiKey);
      }
      // 独立态如有本地会话 token 一并注入（与 onLoginSuccess 持久化对齐）
      const token = readToken();
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
      return config;
    },
  });
  client.addResponseInterceptor(defaultResponseInterceptor({}));
  client.addResponseInterceptor({
    fulfilled: (response) => response,
    rejected: (error: unknown) => {
      const err = error as {
        response?: { status?: number };
        config?: {
          url?: string;
          method?: string;
          headers: Record<string, string>;
          data?: string;
        };
      };
      if (err?.response?.status !== 401) return Promise.reject(error);

      // 401 单飞刷新重放（刷新端点自身的 401 不再刷新——直接跳登录防循环）
      const url = String(err?.config?.url ?? '');
      if (url.includes(REFRESH_PATH) || url.includes('/auth/refresh')) {
        redirectToLogin();
        return Promise.reject(error);
      }
      return refreshAndReplay(() => {
        // 重放：refreshAndReplay 已把新 token 写入 localStorage，本地 client 的
        // 请求拦截器会自动带上新 Authorization——按方法分发到命名函数即可
        //（命名函数走同一 getLocalHttp 实例，双 token 已就位）。
        const cfg = err.config!;
        const method = String(cfg.method ?? 'get').toLowerCase();
        const url = String(cfg.url ?? '');
        const data = cfg.data ? JSON.parse(cfg.data) : undefined;
        switch (method) {
          case 'post':
            return post(url, data);
          case 'put':
            return put(url, data);
          case 'delete':
            return del(url);
          default:
            return get(url);
        }
      }) as never;
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

// ---- 以下 get/put/del 与 post 同形（双态分发 + 同一拦截器链），菜单/用户管理域使用 ----

export async function get(path: string): Promise<unknown> {
  const hostHttp = getProps().http as HostHttpClient | undefined;
  if (typeof hostHttp?.get === 'function') {
    return hostHttp.get(path);
  }
  return getLocalHttp().get(path);
}

export async function put(path: string, body?: unknown): Promise<unknown> {
  const hostHttp = getProps().http as HostHttpClient | undefined;
  if (typeof hostHttp?.put === 'function') {
    return hostHttp.put(path, body);
  }
  return getLocalHttp().put(path, body);
}

/** del（非 delete）：delete 是 JS 保留字，与 RequestClient 方法名解耦 */
export async function del(path: string): Promise<unknown> {
  const hostHttp = getProps().http as HostHttpClient | undefined;
  if (typeof hostHttp?.delete === 'function') {
    return hostHttp.delete(path);
  }
  return getLocalHttp().delete(path);
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
