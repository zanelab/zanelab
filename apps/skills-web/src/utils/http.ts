/*
 * skills-web http 兼容封装（独立运行环境兜底）——iam-web utils/http.ts 的
 * 裁剪平移（任务 11-23-skills-crud-mock）。
 *
 * 集成态：透传宿主 props.http（RequestClient 只读代理，拦截器含解包/token/
 * notify/401 单飞——全部由宿主拦截器链承担，本应用零感知）。
 * 独立态：用 @zanelab/utils RequestClient + 最小拦截器链自建（x-client-info
 * lang= + apikey(.env 配置时) + Authorization Bearer(localStorage 有 token 时)
 * + envelope 解包）。
 *
 * **不含 iam 的 401 单飞刷新链路**：技能接口的 401 只出现在写操作（无/过期
 * JWT），无会话轮换语义——写 401 直接把 envelope 的 msg 抛给调用方提示；
 * 独立态后续接真实登录时再按 iam 版补齐（届时刷新端点在 iam 域）。
 *
 * 业务层只 import 本模块的 get/post/put/del，无 props 分支。
 */
import { defaultResponseInterceptor, RequestClient } from '@zanelab/utils';
import { getProps, type HostHttpClient } from '../props';

/** 独立态本地会话 token key（与 iam 独立态 localStorage.iam_token 同名约定） */
const STANDALONE_TOKEN_KEY = 'iam_token';

let localHttp: HostHttpClient | null = null;

function readToken(): string | null {
  try {
    return localStorage.getItem(STANDALONE_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** 独立态 apikey（.env VITE_API_KEY；与本地客户端请求拦截器同源，单点读取） */
function readApiKey(): string | undefined {
  return import.meta.env.VITE_API_KEY as string | undefined;
}

/** 独立态本地客户端（幂等）：解包 envelope + 语言头 + apikey + Bearer。 */
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
      // 被 Supabase 网关拒绝（iam 线上实测）；edge fn detectLang 解析 lang= 字段
      const locale = (props.preferences?.locale as string) ?? 'zh-CN';
      config.headers.set('x-client-info', `lang=${locale.replace('-', '_')}`);
      // 独立态直连云 Supabase 时需 publishable key（.env 配了才注入；本地
      // supabase start 无鉴权可不填）。集成态由宿主请求拦截器注入，不走此分支。
      const apiKey = readApiKey();
      if (apiKey) {
        config.headers.set('apikey', apiKey);
      }
      // 独立态如有本地会话 token 一并注入（写操作的权限码校验数据源）
      const token = readToken();
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
      return config;
    },
  });
  client.addResponseInterceptor(defaultResponseInterceptor({}));
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

// ---- get/put/del 与 post 同形（双态分发；集成态走宿主拦截器链） ----

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
