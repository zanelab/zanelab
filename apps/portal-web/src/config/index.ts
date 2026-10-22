import { AppConfigSchema, type AppConfig } from '@zanelab/types';

declare global {
  interface Window {
    __APP_CONFIG__?: Record<string, unknown>;
  }
}

export const DEFAULT_CONFIG: AppConfig = {
  version: '20250907',
  system: {
    name: 'ZaneLab',
    nameEn: 'ZaneLab',
    logo: '/logo.svg',
    favicon: '/favicon.ico',
  },
  auth: {
    loginPath: '/login',
    tokenKey: 'portal_token',
    refreshTokenKey: 'portal_refresh_token',
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  api: {
    baseURL: '',
    menusEndpoint: '/api/user/menus',
    userInfoEndpoint: '/api/user/info',
    loginEndpoint: '/sys/auth/login',
    logoutEndpoint: '/sys/auth/logout',
    refreshEndpoint: '/sys/auth/refresh',
    otpEndpoint: '/sys/auth/otp',
    useMock: false,
    agentBaseURL: '/agent/api/v1',
    userPerEndpoint: '/home/user/getUserPer',
    powerAgentEndpoint: '/share/findPowerAgent',
  },
  route: {
    homePath: '/dashboard',
    forbiddenPath: '/403',
    notFoundPath: '/404',
  },
  layout: {
    theme: 'light',
    layout: 'sidebar-nav',
    authPageLayout: 'panel-right',
    fixedHeader: true,
    showBreadcrumb: true,
  },
  preferences: {},
  session: {
    showPlatformManagement: true,
    showTenantManagement: true,
    showTenantSwitcher: true,
  },
  microApps: {},
  icons: {},
  i18n: { packUrls: {} },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function mergeConfig(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(source)) {
    const targetValue = target[key];
    if (isPlainObject(targetValue) && isPlainObject(value)) {
      out[key] = mergeConfig(targetValue, value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function loadConfig(): AppConfig {
  const raw = window.__APP_CONFIG__;
  const merged = raw
    ? mergeConfig(structuredClone(DEFAULT_CONFIG), raw)
    : structuredClone(DEFAULT_CONFIG);
  const parsed = AppConfigSchema.safeParse(merged);
  if (!parsed.success) {
    console.error(
      '[config] 运行时配置校验失败，已回退默认配置：',
      parsed.error.flatten(),
    );
    return structuredClone(DEFAULT_CONFIG);
  }
  return parsed.data;
}

export const appConfig: AppConfig = loadConfig();
