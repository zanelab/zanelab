import { cache } from '@zanelab/utils';
import { appConfig } from '../config';
import { fetchMenus } from '../api/menu';
import { useMenuStore } from '../stores/menu-store';
import { findFirstNavigablePath } from './menu-views';
import {
  X_PLATFORM,
  X_TENANT,
  X_TENANT_ID,
  X_ORG,
  X_ORG_ID,
  SystemType,
} from '../constants/auth';
import type { UserTenantPerVO, UserOrgVO } from '../stores/session-store';

async function redirectToFirstMenu(): Promise<void> {
  try {
    const menus = await fetchMenus();
    useMenuStore.getState().setMenus(menus);
    const target = findFirstNavigablePath(menus);
    if (target) {
      window.location.href = target;
      return;
    }
  } catch (e) {
    console.warn('[session] 切换后端重新拉菜单失败，回退 homePath：', e);
  }
  window.location.href = appConfig.route.homePath;
}

export function switchToPlatform(): void {
  cache.remove(X_TENANT);
  cache.remove(X_TENANT_ID);
  cache.remove(X_ORG);
  cache.remove(X_ORG_ID);
  cache.set(X_PLATFORM, SystemType.PLATFORM);
  void redirectToFirstMenu();
}

export function switchToTenant(tenant: UserTenantPerVO): void {
  cache.remove(X_ORG);
  cache.remove(X_ORG_ID);
  cache.set(X_PLATFORM, SystemType.TENANT);
  cache.set(X_TENANT, tenant.tenantCode);
  cache.set(X_TENANT_ID, tenant.tenantId);

  void redirectToFirstMenu();
}

export function switchToBusiness(
  tenant: UserTenantPerVO,
  org: UserOrgVO,
): void {
  cache.set(X_PLATFORM, SystemType.ORG);
  cache.set(X_TENANT, tenant.tenantCode);
  cache.set(X_TENANT_ID, tenant.tenantId);
  cache.set(X_ORG, org.orgCode);
  cache.set(X_ORG_ID, org.orgId);
  void redirectToFirstMenu();
}

export function switchTenant(tenant: UserTenantPerVO): void {
  const firstOrg = tenant.orgList?.[0];
  if (firstOrg) {
    switchToBusiness(tenant, firstOrg);
  } else {
    switchToTenant(tenant);
  }
}

export function switchOrg(org: UserOrgVO, tenant: UserTenantPerVO): void {
  switchToBusiness(tenant, org);
}
