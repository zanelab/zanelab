import { appConfig } from '../config';
import { useAuthStore } from '../stores/auth-store';
import { useMenuStore } from '../stores/menu-store';
import { cache } from '@zanelab/utils';

/** 清除本地令牌（docs/技术方案.md §5.3）+ 旧项目兼容缓存。 */
export function clearStoredTokens() {
  localStorage.removeItem(appConfig.auth.tokenKey);
  localStorage.removeItem(appConfig.auth.refreshTokenKey);

  // 清除旧项目 cache_ 前缀的兼容存储（子应用共享数据）
  cache.remove('AILab-Token'); // 旧项目兼容 key（cache.ts 加 cache_ 前缀）
  cache.remove('UserInfo');
  cache.remove('TENANT_MAP');
  cache.remove('PowerAgent');

  // 清除旧端标识（字面量——constants/auth 已退役，key 是旧项目 cache 约定）
  for (const key of [
    'X-Platform',
    'X-Tenant',
    'X-TenantId',
    'X-Org',
    'X-OrgId',
  ]) {
    cache.remove(key);
  }
}

/**
 * 统一登出：清 token → 清 auth/menu store → 广播 global-logout。
 * App 顶层监听该事件跳转 config.auth.loginPath（§5.3）。
 */
export function handleLogout() {
  clearStoredTokens();
  useAuthStore.getState().logout();
  window.dispatchEvent(new CustomEvent('global-logout'));

  // 清空后回拉公开菜单子集（无 token），登出后侧边栏/NavigateHome 有落点。
  // 动态 import 避免 auth → api/menu → http → auth-store 的初始化环。
  useMenuStore.getState().clearMenus();
  void import('../micro/register').then(({ loadPublicMenus }) =>
    loadPublicMenus(),
  );
}
