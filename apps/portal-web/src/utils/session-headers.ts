import i18n from '../locales/i18n';
import { useAuthStore } from '../stores/auth-store';

/**
 * 公共请求头集中装配（每请求注入，http.ts 的 refresh fetch 同样复用）：
 * - Content-Type: application/json
 * - Accept-Language: 当前语言（edge fn detectLang 按 /zh/i 检测，zh_CN 下划线
 *   格式命中；**只发网关白名单内的头**——Supabase 网关 CORS allow-headers 固定
 *   （authorization/apikey/content-type/accept-language 等），x-lang、
 *   X-Requested-With 这类旧 Java 网关兼容头不在名单里，预检直接拒绝
 *   （2026-11-10 线上实测 x-lang blocked）
 * - Authorization: Bearer <token>（会话凭据；token 非空才带——logout 后
 *   fire-and-forget 请求不附带）
 */
export function buildLegacyHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // 语言：i18n.language 返回 'zh-CN'/'en-US'，下划线格式与旧约定对齐；
  // edge fn detectLang 只做 /zh/i 包含检测，两种格式都命中
  const lang = i18n.language?.replace('-', '_') || 'zh_CN';
  headers['Accept-Language'] = lang;

  // 会话凭据（从 authStore 读最新值）
  const token = useAuthStore.getState().token;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}
