import { cache } from '@zanelab/utils';
import i18n from '../locales/i18n';
import {
  X_PLATFORM,
  X_TENANT,
  X_TENANT_ID,
  X_ORG,
  X_ORG_ID,
} from '../constants/auth';

/**
 * 旧项目兼容请求头（迁移自 Micro-public/src/app.ts requestInterceptors + httpheader.ts）。
 *
 * 每个请求都带这些头，与旧后端/子应用鉴权约定一致：
 * - x-lang：当前语言（zh-CN → zh_CN 下划线格式，与旧项目 getLocale() 对齐）
 * - X-Platform / X-Tenant / X-TenantId / X-Org / X-OrgId：端标识，从 cache 读取
 * - X-Requested-With: XMLHttpRequest（旧项目固定头）
 *
 * ailab-token（TOKEN_HEADER 常量）由 http 拦截器单独设置（需从 authStore 读最新 token），
 * 此函数只返回不含 token 的公共头。
 */
export function buildLegacyHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json',
  };

  // 语言：i18n.language 返回 'zh-CN'/'en-US'，旧后端期望下划线格式
  const lang = i18n.language?.replace('-', '_') || 'zh_CN';
  headers['x-lang'] = lang;

  // 端标识（从 cache 读取，登录后 bootstrapSession 写入）
  const platform = cache.get<string>(X_PLATFORM);
  if (platform) headers[X_PLATFORM] = platform;

  const tenantCode = cache.get<string>(X_TENANT);
  if (tenantCode) headers[X_TENANT] = tenantCode;

  const tenantId = cache.get<string | number>(X_TENANT_ID);
  if (tenantId != null) headers[X_TENANT_ID] = String(tenantId);

  const orgCode = cache.get<string>(X_ORG);
  if (orgCode) headers[X_ORG] = orgCode;

  const orgId = cache.get<string | number>(X_ORG_ID);
  if (orgId != null) headers[X_ORG_ID] = String(orgId);

  return headers;
}
