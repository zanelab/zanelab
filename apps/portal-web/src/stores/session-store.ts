import { create } from 'zustand';
import { cache } from '@zanelab/utils';
import { X_PLATFORM, X_TENANT, X_ORG, SystemType } from '../constants/auth';

// ── 类型（从旧项目迁移，与 api/auth.ts 内部定义对齐，此处导出供全局使用） ──

export interface UserOrgVO {
  orgId: number;
  orgCode: string;
  orgName: string;
  isDefault: boolean;
  desc?: string;
}

export interface UserTenantPerVO {
  tenantId: number;
  tenantCode: string;
  tenantName: string;
  isDefault: boolean;
  isPerm: boolean;
  orgList: UserOrgVO[];
  username: string;
}

export interface UserPerVO {
  isPlatform: boolean;
  tenantList: UserTenantPerVO[];
}

// ── 派生 helpers（从 cache 读取当前端/租户/空间） ──

/** 获取端标识（-P / -T / -O） */
export function getPlatformFlag(): string | null {
  return cache.get<string>(X_PLATFORM);
}

/** 是否平台管理端 */
export function isPlatformAdmin(): boolean {
  return getPlatformFlag() === SystemType.PLATFORM;
}

/** 是否租户管理端 */
export function isTenantAdmin(): boolean {
  return getPlatformFlag() === SystemType.TENANT;
}

/** 是否业务端（空间端） */
export function isBusinessEnd(): boolean {
  return getPlatformFlag() === SystemType.ORG;
}

/**
 * 从 tenantList 中根据 cache 的 X-Tenant 找到当前租户；
 * 未命中则取有权限租户（见 pickPermittedTenant），再否则取 isDefault / 第一个。
 */
export function getCurrentTenant(
  tenantList: UserTenantPerVO[],
): UserTenantPerVO | undefined {
  if (!tenantList?.length) return undefined;
  const tenantCode = cache.get<string>(X_TENANT);
  return (
    tenantList.find((t) => t.tenantCode === tenantCode) ||
    pickPermittedTenant(tenantList) ||
    tenantList.find((t) => t.isDefault) ||
    tenantList[0]
  );
}

/**
 * 选「有租户权限」的默认租户。
 *
 * 后端会下发**占位租户**（`isPerm: false` 且 `orgList: []`，如 tenantCode=t00001），
 * 它出现在列表里但不代表用户可用它进系统。以它身份请求 /user/menu/tree 会返回
 * 213009「无租户角色或者角色无菜单权限」→ 登录后没有菜单、进不去（09-24 修复）。
 *
 * 顺序：isPerm 里先 isDefault → 首个带空间（orgList 非空）→ 第一个。
 * 全部无 isPerm 时返回 undefined（由 pickDefaultEnd 决定退路）。
 */
export function pickPermittedTenant(
  tenantList: UserTenantPerVO[],
): UserTenantPerVO | undefined {
  const permitted = tenantList?.filter((t) => t.isPerm) ?? [];
  return (
    permitted.find((t) => t.isDefault) ||
    permitted.find((t) => t.orgList?.length) ||
    permitted[0]
  );
}

/** 首次进端的端选择结果 */
export interface DefaultEnd {
  /** 端标识值（SystemType.PLATFORM / TENANT / ORG） */
  platform: string;
  tenant?: UserTenantPerVO;
  org?: UserOrgVO;
}

/**
 * 首次进端（登录/刷新，cache 无端标识或端标识已失效时）选默认端：
 *   ① 有权限租户 + 其默认/首个空间 → 空间端（-O）
 *   ② 有权限租户但无空间 → 租户端（-T）
 *   ③ 无任何有权限租户：平台管理员 → 平台端（-P，否则必然 213009）；
 *      非平台管理员 → 保持老行为（第一条租户 + -T，后端没下发可用租户时无更好选择）
 *
 * 用户进系统后可通过下拉菜单/租户切换器自行换端，此处只保证「能进去」。
 */
export function pickDefaultEnd(userPer: UserPerVO): DefaultEnd {
  const tenant = pickPermittedTenant(userPer.tenantList);
  if (tenant) {
    const org = tenant.orgList?.find((o) => o.isDefault) || tenant.orgList?.[0];
    return org
      ? { platform: SystemType.ORG, tenant, org }
      : { platform: SystemType.TENANT, tenant };
  }
  const first = userPer.tenantList?.[0];
  if (userPer.isPlatform || !first) return { platform: SystemType.PLATFORM };
  return { platform: SystemType.TENANT, tenant: first };
}

/**
 * cache 中已有的端标识是否仍可用（用户主动切换过的选择要保留，脏值要丢弃）。
 *
 * 判定：
 * - 平台端（-P）：无需租户，直接可用
 * - 租户端（-T）：X-Tenant 命中 tenantList 且该租户 isPerm
 * - 空间端（-O）：在前者基础上，X-Org 必须存在于该租户的 orgList
 *
 * 为什么必须校验：历史版本会把占位租户（isPerm=false，如 t00001）写进 cache，
 * 该值会一直残留 → 之后每次进系统都以无权限租户拉菜单 → 213009。
 * 而用户能主动选择的只有 isPerm=true 的租户（切换器只列这些），故缓存里的
 * 非 isPerm 值必是脏值，可以安全丢弃。
 */
export function isCachedEndUsable(userPer: UserPerVO): boolean {
  const platform = cache.get<string>(X_PLATFORM);
  if (!platform) return false;
  if (platform === SystemType.PLATFORM) return true;

  const tenantCode = cache.get<string>(X_TENANT);
  const tenant = userPer.tenantList?.find((t) => t.tenantCode === tenantCode);
  if (!tenant?.isPerm) return false;

  if (platform === SystemType.ORG) {
    const orgCode = cache.get<string>(X_ORG);
    return !!tenant.orgList?.some((o) => o.orgCode === orgCode);
  }
  return platform === SystemType.TENANT;
}

// ── Store ──

export interface SessionState {
  /** getUserPer 原始响应 */
  userPer: UserPerVO | null;
  /** 便捷访问：租户列表 */
  tenantList: UserTenantPerVO[];
  /** 便捷访问：是否平台管理员（isPlatform） */
  isPlatform: boolean;
}

interface SessionStore extends SessionState {
  setUserPer: (userPer: UserPerVO | null) => void;
  clear: () => void;
}

export const initialSessionState: SessionState = {
  userPer: null,
  tenantList: [],
  isPlatform: false,
};

export const useSessionStore = create<SessionStore>()((set) => ({
  ...initialSessionState,

  setUserPer: (userPer) =>
    set({
      userPer,
      tenantList: userPer?.tenantList ?? [],
      isPlatform: userPer?.isPlatform ?? false,
    }),

  clear: () => set({ ...initialSessionState }),
}));
