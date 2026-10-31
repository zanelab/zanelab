import { AppConfigSchema, type AppConfig } from '@zanelab/types';

declare global {
  interface Window {
    __APP_CONFIG__?: Record<string, unknown>;
  }
}

// 与 public/config.js 保持一致的默认配置。运行时配置缺失时回退到这里。
// api.baseURL 默认留空 = 同源；接真后端时改 config.js。
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
    loginPage: {
      layout: 'panel-right',
      showCodeLogin: true,
      showQrcodeLogin: true,
      showThirdPartyLogin: true,
      showRegister: true,
      showForgetPassword: true,
      showRememberMe: true,
      showColorToggle: true,
      showLayoutToggle: true,
    },
  },
  api: {
    baseURL: '',
    menusEndpoint: '/api/user/menus',
    loginEndpoint: '/sys/auth/login',
    logoutEndpoint: '/sys/auth/logout',
    refreshEndpoint: '/sys/auth/refresh',
  },
  route: {
    homePath: '/home',
    forbiddenPath: '/403',
    notFoundPath: '/404',
  },
  layout: {
    theme: 'light',
    layout: 'sidebar-nav',
    fixedHeader: true,
    showBreadcrumb: true,
  },
  preferences: {},
  microApps: {},
  icons: {},
  i18n: { packUrls: {} },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 深合并：target 为默认值，source 覆盖同名键；对象递归、其余整值替换。 */
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

/**
 * 读取 window.__APP_CONFIG__ → 深合并默认值 → zod 校验。
 * 校验失败：console.error 后回退默认配置（不允许抛异常卡死应用，见 spec）。
 */
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

/** 模块级配置实例：加载一次，供非 React 模块（http、api）同步读取。 */
export const appConfig: AppConfig = loadConfig();
