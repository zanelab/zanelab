import i18n from '../locales/i18n';
import { useAuthStore } from '../stores/auth-store';

/**
 * 公共请求头集中装配（每请求注入，http.ts 的 refresh fetch 同样复用）：
 * - X-Requested-With: XMLHttpRequest（XHR 语义固定头）
 * - x-lang：当前语言（zh-CN → zh_CN 下划线格式，与旧项目 getLocale() 对齐）
 * - Authorization: Bearer <token>（会话凭据；token 非空才带——logout 后
 *   fire-and-forget 请求不附带）
 */
export function buildLegacyHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json',
  };

  // 语言：i18n.language 返回 'zh-CN'/'en-US'，旧后端期望下划线格式
  const lang = i18n.language?.replace('-', '_') || 'zh_CN';
  headers['x-lang'] = lang;

  // 会话凭据（从 authStore 读最新值）
  const token = useAuthStore.getState().token;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}
