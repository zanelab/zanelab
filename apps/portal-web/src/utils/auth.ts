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

export function clearStoredTokens() {
  localStorage.removeItem(appConfig.auth.tokenKey);
  localStorage.removeItem(appConfig.auth.refreshTokenKey);

  cache.remove(LEGACY_TOKEN_KEY);
  cache.remove('UserInfo');
  cache.remove('TENANT_MAP');
  cache.remove('PowerAgent');

  cache.remove(X_PLATFORM);
  cache.remove(X_TENANT);
  cache.remove(X_TENANT_ID);
  cache.remove(X_ORG);
  cache.remove(X_ORG_ID);
}

export async function handleLogout() {
  clearStoredTokens();
  await useAuthStore.getState().logout();
  useMenuStore.getState().clearMenus();
  useSessionStore.getState().clear();
  window.dispatchEvent(new CustomEvent('global-logout'));
}
