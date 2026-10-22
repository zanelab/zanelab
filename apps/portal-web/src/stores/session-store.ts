import { create } from 'zustand';
import { cache } from '@zanelab/utils';
import { X_PLATFORM, X_TENANT, X_ORG, SystemType } from '../constants/auth';

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

export function getPlatformFlag(): string | null {
  return cache.get<string>(X_PLATFORM);
}

export function isPlatformAdmin(): boolean {
  return getPlatformFlag() === SystemType.PLATFORM;
}

export function isTenantAdmin(): boolean {
  return getPlatformFlag() === SystemType.TENANT;
}

export function isBusinessEnd(): boolean {
  return getPlatformFlag() === SystemType.ORG;
}

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

export function getCurrentOrg(tenant?: UserTenantPerVO): UserOrgVO | undefined {
  if (!tenant?.orgList?.length) return undefined;
  const orgCode = cache.get<string>(X_ORG);
  return (
    tenant.orgList.find((o) => o.orgCode === orgCode) ||
    tenant.orgList.find((o) => o.isDefault) ||
    tenant.orgList[0]
  );
}

export function isSameOrg(current?: UserOrgVO, candidate?: UserOrgVO): boolean {
  if (!current || !candidate) return false;
  if (current === candidate) return true;
  if (
    current.orgCode &&
    candidate.orgCode &&
    current.orgCode === candidate.orgCode
  ) {
    return true;
  }

  return false;
}

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

export interface DefaultEnd {
  platform: string;
  tenant?: UserTenantPerVO;
  org?: UserOrgVO;
}

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

export interface SessionState {
  userPer: UserPerVO | null;

  tenantList: UserTenantPerVO[];

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
