import { appConfig } from '../config';
import { useAuthStore } from '../stores/auth-store';
import { useMenuStore } from '../stores/menu-store';
import { useSessionStore } from '../stores/session-store';
import { cache } from '@zanelab/utils';
import {
  LEGACY_TOKEN_KEY,
  X_PLATFORM,
  X_TENANT,
  X_TENANT_ID,
  X_ORG,
  X_ORG_ID,
} from '../constants/auth';

/** 清除本地令牌（docs/技术方案.md §5.3）+ 旧项目兼容缓存。 */
export function clearStoredTokens() {
  localStorage.removeItem(appConfig.auth.tokenKey);
  localStorage.removeItem(appConfig.auth.refreshTokenKey);

  // 清除旧项目 cache_ 前缀的兼容存储（子应用共享数据）
  cache.remove(LEGACY_TOKEN_KEY);
  cache.remove('UserInfo');
  cache.remove('TENANT_MAP');
  cache.remove('PowerAgent');

  // 清除端标识
  cache.remove(X_PLATFORM);
  cache.remove(X_TENANT);
  cache.remove(X_TENANT_ID);
  cache.remove(X_ORG);
  cache.remove(X_ORG_ID);
}

/**
 * 统一登出：清 token → 清 auth/menu/session store → 广播 global-logout。
 * App 顶层监听该事件跳转 config.auth.loginPath（§5.3）。
 */
export function handleLogout() {
  clearStoredTokens();
  useAuthStore.getState().logout();
  useSessionStore.getState().clear();
  window.dispatchEvent(new CustomEvent('global-logout'));

  // 清空后回拉公开菜单子集（无 token），登出后侧边栏/NavigateHome 有落点。
  // 动态 import 避免 auth → api/menu → http → auth-store 的初始化环。
  useMenuStore.getState().clearMenus();
  void import('../micro/register').then(({ loadPublicMenus }) =>
    loadPublicMenus(),
  );
}
