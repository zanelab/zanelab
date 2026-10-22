import { registerMicroApps, start, type RegistrableApp } from 'qiankun';
import { appConfig } from '../config';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';
import { useMenuStore } from '../stores/menu-store';
import { usePreferencesStore } from '../stores/preferences-store';
import {
  useSessionStore,
  isCachedEndUsable,
  pickDefaultEnd,
} from '../stores/session-store';
import { clearStoredTokens, handleLogout } from '../utils/auth';
import { isSessionExpiredError } from '../utils/http';
import { cache } from '@zanelab/utils';
import {
  LEGACY_TOKEN_KEY,
  X_PLATFORM,
  X_TENANT,
  X_TENANT_ID,
  X_ORG,
  X_ORG_ID,
} from '../constants/auth';
import { fetchMenus } from '../api/menu';
import { authApi } from '../api/auth';
import type { UserInfo } from '../types';
import type { UserPerVO } from '../stores/session-store';

function containerId(appName: string, container?: string): string {
  return container?.replace(/^#/, '') || `subapp-${appName}`;
}

function applyTenantHeaders(userPer: UserPerVO | null) {
  if (!userPer?.tenantList?.length) return;

  const tenantMap = userPer.tenantList.reduce<Record<string, unknown>>(
    (pre, cur) => {
      pre[cur.tenantCode] = cur;
      return pre;
    },
    {},
  );
  cache.set('TENANT_MAP', tenantMap);

  if (isCachedEndUsable(userPer)) return;

  const hadCachedEnd = !!cache.get<string>(X_PLATFORM);
  const { platform, tenant, org } = pickDefaultEnd(userPer);
  if (hadCachedEnd) {
    console.warn(
      '[session] 缓存端标识已失效，按权限重选默认端：',
      platform,
      tenant?.tenantCode ?? '',
      org?.orgCode ?? '',
    );
  }

  cache.remove(X_TENANT);
  cache.remove(X_TENANT_ID);
  cache.remove(X_ORG);
  cache.remove(X_ORG_ID);
  cache.set(X_PLATFORM, platform);
  if (tenant) {
    cache.set(X_TENANT, tenant.tenantCode);
    cache.set(X_TENANT_ID, tenant.tenantId);
  }
  if (org) {
    cache.set(X_ORG, org.orgCode);
    cache.set(X_ORG_ID, org.orgId);
  }
}

export async function bootstrapSession(
  token: string,
  _refreshToken?: string,
  user?: UserInfo,
) {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    useAuthStore.getState().setSession(data.session);
  }

  cache.set(LEGACY_TOKEN_KEY, token);
  if (user) cache.set('UserInfo', user);

  try {
    const userPer = await authApi.getUserPer();
    applyTenantHeaders(userPer);
    useSessionStore.getState().setUserPer(userPer);
  } catch (e) {
    console.warn('[bootstrapSession] getUserPer failed:', e);
  }

  try {
    const powerAgent = await authApi.findPowerAgent();
    if (powerAgent) cache.set('PowerAgent', powerAgent);
  } catch (e) {
    console.warn('[bootstrapSession] findPowerAgent failed:', e);
  }

  const menus = await fetchMenus();
  useMenuStore.getState().setMenus(menus);
  setupMicroApps();
}

export async function restoreSession(_token: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) {
    useAuthStore.getState().setSession(session);
  } else {
    redirectToLogin();
    return;
  }

  try {
    const userPer = await authApi.getUserPer();
    applyTenantHeaders(userPer);
    useSessionStore.getState().setUserPer(userPer);
  } catch (e) {
    console.warn('[restoreSession] getUserPer failed:', e);

    if (isSessionExpiredError(e)) {
      redirectToLogin();
      return;
    }
  }

  try {
    const menus = await fetchMenus();
    useMenuStore.getState().setMenus(menus);
  } catch (e) {
    console.warn('[restoreSession] fetchMenus failed:', e);
    if (isSessionExpiredError(e)) {
      redirectToLogin();
      return;
    }
  }
  setupMicroApps();
}

export async function bootstrapAfterAuth(): Promise<void> {
  try {
    const userPer = await authApi.getUserPer();
    applyTenantHeaders(userPer);
    useSessionStore.getState().setUserPer(userPer);
  } catch (e) {
    console.warn('[bootstrapAfterAuth] getUserPer failed:', e);
  }

  try {
    const powerAgent = await authApi.findPowerAgent();
    if (powerAgent) cache.set('PowerAgent', powerAgent);
  } catch (e) {
    console.warn('[bootstrapAfterAuth] findPowerAgent failed:', e);
  }

  const menus = await fetchMenus();
  useMenuStore.getState().setMenus(menus);
  setupMicroApps();
}

function redirectToLogin(): void {
  handleLogout();
  window.location.replace(appConfig.auth.loginPath);
}

let registered = false;

export function __resetMicroAppsForTest() {
  registered = false;
}

const QIANKUN_STYLE_ISOLATION_SANDBOX = { experimentalStyleIsolation: true };

export function setupMicroApps() {
  if (registered) return;
  const apps: RegistrableApp<Record<string, unknown>>[] = Object.entries(
    appConfig.microApps,
  ).map(([appName, cfg]) => ({
    name: cfg.name || appName,
    entry: cfg.entry,
    container: `#${containerId(appName, cfg.container)}`,
    activeRule: cfg.activeRule,
    props: {
      ...cfg.props,

      http: window.__http,

      get accessToken() {
        return useAuthStore.getState().token;
      },
      get token() {
        return useAuthStore.getState().token;
      },
      get permissions() {
        return useMenuStore.getState().permissions;
      },

      get locale() {
        return usePreferencesStore.getState().app.locale;
      },

      getHostState,
      onHostStateChange,

      base: cfg.activeRule,
      basename: cfg.activeRule,
    },
  }));
  if (apps.length === 0) return;
  registered = true;
  registerMicroApps(apps);

  const prefetchNames = new Set(
    Object.entries(appConfig.microApps)
      .filter(([, cfg]) => cfg.prefetch)
      .map(([key, cfg]) => cfg.name || key),
  );
  start({
    sandbox: QIANKUN_STYLE_ISOLATION_SANDBOX,
    prefetch: (list) => ({
      criticalAppNames: list
        .filter((app) => prefetchNames.has(app.name))
        .map((app) => app.name),
      minorAppsName: [],
    }),
  });
}

function snapshot() {
  return {
    token: useAuthStore.getState().token,
    user: useAuthStore.getState().user,
    permissions: useMenuStore.getState().permissions,
    locale: usePreferencesStore.getState().app.locale,
  };
}

export type HostState = ReturnType<typeof snapshot>;
export type HostStateListener = (state: HostState, prev: HostState) => void;

const hostStateListeners = new Set<HostStateListener>();

let hostStateSyncStarted = false;

export function getHostState(): HostState {
  return snapshot();
}

export function onHostStateChange(
  listener: HostStateListener,
  fireImmediately = false,
) {
  if (typeof listener !== 'function') {
    console.error('[micro] onHostStateChange 需要传入回调函数');
    return () => {};
  }
  hostStateListeners.add(listener);
  if (fireImmediately) {
    const current = snapshot();
    listener(current, current);
  }
  return () => {
    hostStateListeners.delete(listener);
  };
}

const hostStateUnsubscribes: Array<() => void> = [];

export function __resetHostStateForTest() {
  hostStateSyncStarted = false;
  hostStateUnsubscribes.splice(0).forEach((off) => off());
  hostStateListeners.clear();
}

export function setupHostState() {
  if (hostStateSyncStarted) return;
  hostStateSyncStarted = true;
  let prev = snapshot();
  const pushIfChanged = () => {
    const next = snapshot();
    if (
      next.token !== prev.token ||
      next.user !== prev.user ||
      next.permissions !== prev.permissions ||
      next.locale !== prev.locale
    ) {
      const changedFrom = prev;
      prev = next;

      for (const listener of [...hostStateListeners])
        listener(next, changedFrom);
    }
  };
  hostStateUnsubscribes.push(
    useAuthStore.subscribe(pushIfChanged),
    useMenuStore.subscribe(pushIfChanged),
    usePreferencesStore.subscribe(pushIfChanged),
  );
}

export function watchGlobalLogout(navigate: (path: string) => void) {
  const handler = () => navigate(appConfig.auth.loginPath);
  window.addEventListener('global-logout', handler);
  return () => window.removeEventListener('global-logout', handler);
}

export { clearStoredTokens };
