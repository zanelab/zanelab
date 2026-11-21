import i18n from '../locales/i18n';
import { appConfig } from '../config';
import { useAuthStore } from '../stores/auth-store';

/**
 * 公共请求头集中装配（每请求注入，http.ts 的 refresh fetch 同样复用）。
 * **只发 Supabase 网关 CORS 白名单内的头**（authorization / x-client-info /
 * apikey / content-type / x-retry-count / traceparent / tracestate / baggage，
 * 平台固定、项目级不可配置）——XHR 显式 set 的头会进预检 Request-Headers，
 * 白名单外一律被拒（x-lang、X-Requested-With、Accept-Language 均线上踩坑：
 * 2026-11-09/10 实测）：
 * - Content-Type: application/json
 * - x-client-info: 'lang=<zh_CN|en_US>'（语言主通道——edge fn detectLang 解析
 *   lang= 字段；k=v 逗号对格式，后续可扩展字段。原 Accept-Language 通道因
 *   网关白名单外被弃）
 * - Authorization: Bearer <token>（会话凭据；token 非空才带——logout 后
 *   fire-and-forget 请求不附带）
 * - apikey: config.publishableKey（配置了才带）。注意 /auth/refresh 虽是
 *   匿名端点（Edge Fn 不校验 JWT），但 **网关层仍要求 apikey**——缺失会被
 *   平台网关以 401 MISSING_CREDENTIALS 拦截（请求到不了 Edge Function），
 *   故统一在此注入，业务请求与 refresh fetch 同源（2026-11-21 修复）
 */
export function buildLegacyHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // 语言：i18n.language 返回 'zh-CN'/'en-US'，下划线格式与旧约定对齐；
  // edge fn detectLang 对 lang= 值做 /zh/i 包含检测，两种格式都命中
  const lang = i18n.language?.replace('-', '_') || 'zh_CN';
  headers['x-client-info'] = `lang=${lang}`;

  // 会话凭据（从 authStore 读最新值）
  const token = useAuthStore.getState().token;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // 网关鉴权（云 Supabase 要求；默认 undefined = 不注入，本地 supabase start
  // 无鉴权可不配。与请求拦截器原注入点同源，收敛到本函数后 refresh fetch 自动带上）
  if (appConfig.api.publishableKey) {
    headers.apikey = appConfig.api.publishableKey;
  }

  return headers;
}
