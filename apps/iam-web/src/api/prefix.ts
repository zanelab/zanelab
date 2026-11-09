/*
 * iam-web API 前缀解析 —— auth/menus/users/roles 四域共用的单点助手。
 *
 * 解析顺序（任务 11-08 S1）：
 * 1. 显式 props.apiPrefix 优先：部署期直连 Supabase 时部署 config.js 传 ''——
 *    宿主共享 http 实例的 endpoint 已含完整路径（如 /iam/functions/v1/...），
 *    再拼 basename 派生前缀会双前缀 404。**空串是合法显式值**：判定用 typeof
 *    而非 ??（?? 只回退 nullish/非 string，空串不会掉进 basename 分支）；
 *    显式 null 等非字符串脏值（props 来自宿主 JS，类型层不可信）视同未传。
 * 2. 未传 → props.basename 派生（dev 集成态 = activeRule '/iam'，请求经宿主
 *    vite 代理剥前缀转发；独立态缺省 → ''，请求直落本 dev server——独立运行
 *    性硬约定的「props 派生值缺省有义」分支）。
 *
 * 放 api/ 层而非 props.ts：前缀是 api 域的寻址语义，props.ts 只做契约与存取；
 * 也不能进 endpoints.ts——那是零 import 模块（mock worker 依赖，见其头注释），
 * 本模块引 ../props 会把应用状态拖进 worker bundle。
 */
import { getProps, type PltProps } from '../props';

/** 去尾斜杠（'/foo/' → '/foo'；'/' → ''）。 */
function stripTrailingSlash(prefix: string): string {
  return prefix.replace(/\/$/, '');
}

/**
 * 纯函数形态（收 props 对象）：单测四分支直测，不经模块级 store。
 * api 域实际消费的是下方 apiPrefix()。
 */
export function resolveApiPrefix(props: PltProps): string {
  if (typeof props.apiPrefix === 'string') {
    return stripTrailingSlash(props.apiPrefix);
  }
  return typeof props.basename === 'string'
    ? stripTrailingSlash(props.basename)
    : '';
}

/** 取最新 props 解析前缀（qiankun mount 时 setProps 写入，每次调用读最新值）。 */
export function apiPrefix(): string {
  return resolveApiPrefix(getProps());
}
