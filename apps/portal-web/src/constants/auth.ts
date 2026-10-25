/**
 * 认证相关常量（迁移自旧项目 Micro-public/src/constants/index.ts + session.ts + enum.ts）。
 *
 * 旧后端契约：
 * - TOKEN_HEADER：HTTP 请求头名，传输 raw token（无 Bearer 前缀）
 * - LEGACY_TOKEN_KEY：localStorage cache key（经 cache.ts 加 cache_ 前缀 → cache_AILab-Token）
 * - X_*：端标识 cache key，buildLegacyHeaders 读取并注入请求头
 * - SystemType：端标识值（-P 平台端 / -T 租户端 / -O 空间端）
 */

/** 旧后端 token HTTP 请求头名 */
export const TOKEN_HEADER = 'ailab-token';

/** 旧项目兼容 localStorage cache key（存 token，子应用共享） */
export const LEGACY_TOKEN_KEY = 'AILab-Token';

// ── Session cache key（旧项目 constants/session.ts） ──

export const X_PLATFORM = 'X-Platform';
export const X_TENANT = 'X-Tenant';
export const X_TENANT_ID = 'X-TenantId';
export const X_ORG = 'X-Org';
export const X_ORG_ID = 'X-OrgId';

// ── 端标识值（旧项目 constants/enum.ts SystemType） ──

export const SystemType = {
  /** 平台端 */
  PLATFORM: '-P',
  /** 租户端 */
  TENANT: '-T',
  /** 空间端/业务端 */
  ORG: '-O',
} as const;
