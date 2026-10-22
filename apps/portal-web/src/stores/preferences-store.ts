import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  LayoutMode,
  ContentCompact,
  NavigationStyleType,
  BreadcrumbStyleType,
  BuiltinThemeType,
  AccessModeType,
  LoginExpiredModeType,
  AuthPageLayoutType,
  LogoFitType,
} from '@zanelab/types';
import { normalizeLocale } from '@zanelab/utils';

export type TabbarStyleType = 'plain' | 'chrome' | 'card' | 'brisk';

interface PreferencesState {
  app: {
    accessMode: AccessModeType;
    authPageLayout: AuthPageLayoutType;
    checkUpdatesInterval: number;
    compact: boolean;
    contentCompact: ContentCompact;
    contentCompactWidth: number;
    contentPadding: number;
    contentPaddingTop: number;
    contentPaddingBottom: number;
    contentPaddingLeft: number;
    contentPaddingRight: number;
    defaultAvatar: string;
    defaultHomePath: string;
    dynamicTitle: boolean;
    enableCheckUpdates: boolean;
    enableCopyPreferences: boolean;
    enablePreferences: boolean;
    enableRefreshToken: boolean;
    enableStickyPreferencesNavigationBar: boolean;
    isMobile: boolean;
    layout: LayoutMode;
    locale: string;
    loginExpiredMode: LoginExpiredModeType;
    name: string;
    preferencesButtonPosition: string;
    timezone: string;
    watermark: boolean;
    watermarkContent: string;
    zIndex: number;
    colorWeakMode: boolean;
    colorGrayMode: boolean;
  };
  header: {
    enable: boolean;
    hidden: boolean;
    height: number;
    menuAlign: 'start' | 'center' | 'end';
    mode: 'fixed' | 'auto' | 'auto-scroll' | 'static';
  };
  sidebar: {
    enable: boolean;
    hidden: boolean;
    collapsed: boolean;
    width: number;
    collapseWidth: number;
    mixedWidth: number;
    extraCollapse: boolean;
    extraCollapsedWidth: number;
    theme: 'dark' | 'light';
    themeSub: 'dark' | 'light';
    expandOnHover: boolean;
    collapseShowTitle: boolean;
    collapsedShowTitle: boolean;
    collapsedButton: boolean;
    fixedButton: boolean;
    draggable: boolean;
    autoActivateChild: boolean;
    buttons: string[];
  };
  footer: {
    enable: boolean;
    fixed: boolean;
    height: number;
  };
  tabbar: {
    enable: boolean;
    height: number;
    draggable: boolean;
    keepAlive: boolean;
    showIcon: boolean;
    showMaximize: boolean;
    showMore: boolean;
    showRefresh: boolean;
    styleType: TabbarStyleType;
    persist: boolean;
    wheelable: boolean;
    middleClickToClose: boolean;
    visitHistory: boolean;
    maxCount: number;
  };
  navigation: {
    accordion: boolean;
    split: boolean;
    styleType: NavigationStyleType;
  };
  breadcrumb: {
    enable: boolean;
    hideOnlyOne: boolean;
    showHome: boolean;
    showIcon: boolean;
    styleType: BreadcrumbStyleType;
  };
  logo: {
    enable: boolean;
    fit: LogoFitType;
    source: string;
    sourceDark: string;
  };
  copyright: {
    enable: boolean;
    companyName: string;
    companySiteLink: string;
    date: string;
    icp: string;
    icpLink: string;
    settingShow: boolean;
  };
  widget: {
    sidebarToggle: boolean;
    lockScreen: boolean;
    fullscreen: boolean;
    globalSearch: boolean;
    languageToggle: boolean;
    refresh: boolean;
    themeToggle: boolean;
    notification: boolean;
    timezone: boolean;
  };
  theme: {
    mode: 'light' | 'dark' | 'auto';
    builtinType: BuiltinThemeType;
    colorPrimary: string;
    colorDestructive: string;
    colorSuccess: string;
    colorWarning: string;
    radius: string;
    fontSize: number;
    semiDarkSidebar: boolean;
    semiDarkSidebarSub: boolean;
    semiDarkHeader: boolean;
  };
  shortcutKeys: {
    enable: boolean;
    globalSearch: boolean;
    globalLockScreen: boolean;
    globalLogout: boolean;

    globalPreferences: boolean;
  };
  transition: {
    enable: boolean;
    name: string;
    loading: boolean;
    progress: boolean;
  };

  updatePreferences: (partial: DeepPartial<PreferencesState>) => void;
  setLayout: (layout: LayoutMode) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  resetPreferences: () => void;
}

type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

const defaultPreferences: Omit<
  PreferencesState,
  | 'updatePreferences'
  | 'setLayout'
  | 'setSidebarCollapsed'
  | 'toggleSidebar'
  | 'resetPreferences'
> = {
  app: {
    accessMode: 'frontend',
    authPageLayout: 'panel-right',
    checkUpdatesInterval: 1,
    compact: false,
    contentCompact: 'wide',
    contentCompactWidth: 1200,
    contentPadding: 0,
    contentPaddingTop: 0,
    contentPaddingBottom: 0,
    contentPaddingLeft: 0,
    contentPaddingRight: 0,
    defaultAvatar: '',
    defaultHomePath: '/home',
    dynamicTitle: true,
    enableCheckUpdates: true,
    enableCopyPreferences: true,
    enablePreferences: true,
    enableRefreshToken: false,
    enableStickyPreferencesNavigationBar: true,
    isMobile: false,
    layout: 'sidebar-nav',
    locale: 'zh-CN',
    loginExpiredMode: 'page',
    name: '',
    preferencesButtonPosition: 'auto',
    timezone: 'Asia/Shanghai',
    watermark: false,
    watermarkContent: '',
    zIndex: 200,
    colorWeakMode: false,
    colorGrayMode: false,
  },
  header: {
    enable: true,
    hidden: false,
    height: 50,
    menuAlign: 'start',
    mode: 'fixed',
  },
  sidebar: {
    enable: true,
    hidden: false,
    collapsed: false,
    width: 224,
    collapseWidth: 60,
    mixedWidth: 80,
    extraCollapse: false,
    extraCollapsedWidth: 60,
    theme: 'dark',
    themeSub: 'dark',
    expandOnHover: true,
    collapseShowTitle: false,
    collapsedShowTitle: false,
    collapsedButton: true,
    fixedButton: true,
    draggable: true,
    autoActivateChild: false,
    buttons: ['collapsed', 'fixed'],
  },
  footer: {
    enable: false,
    fixed: false,
    height: 32,
  },
  tabbar: {
    enable: true,
    height: 38,
    draggable: true,
    keepAlive: true,
    showIcon: true,
    showMaximize: true,
    showMore: true,
    showRefresh: true,
    styleType: 'chrome',
    persist: true,
    wheelable: true,
    middleClickToClose: false,
    visitHistory: true,
    maxCount: 0,
  },
  navigation: {
    accordion: true,
    split: true,
    styleType: 'rounded',
  },
  breadcrumb: {
    enable: true,
    hideOnlyOne: false,
    showHome: false,
    showIcon: true,
    styleType: 'normal',
  },
  logo: {
    enable: true,
    fit: 'contain',
    source: '/logo.svg',
    sourceDark: '',
  },
  copyright: {
    enable: true,
    companyName: '',
    companySiteLink: '#',
    date: '2026',
    icp: '',
    icpLink: '',
    settingShow: true,
  },
  widget: {
    sidebarToggle: true,
    lockScreen: true,
    fullscreen: true,
    globalSearch: true,
    languageToggle: true,
    refresh: true,
    themeToggle: true,
    notification: true,
    timezone: true,
  },
  theme: {
    mode: 'dark',
    builtinType: 'default',
    colorPrimary: 'hsl(212 100% 45%)',
    colorDestructive: 'hsl(348 100% 61%)',
    colorSuccess: 'hsl(144 57% 58%)',
    colorWarning: 'hsl(42 84% 61%)',
    radius: '0.5',
    fontSize: 16,
    semiDarkSidebar: false,
    semiDarkSidebarSub: false,
    semiDarkHeader: false,
  },
  shortcutKeys: {
    enable: true,
    globalSearch: true,
    globalLockScreen: true,
    globalLogout: true,
    globalPreferences: true,
  },
  transition: {
    enable: true,
    name: 'fade-slide',
    loading: true,
    progress: true,
  },
};

const PREFERENCES_STORAGE_KEY = 'zanelab-preferences';

export const USER_LOCALE_KEY = 'zanelab_user_locale';

export function hasUserChosenLocale(): boolean {
  try {
    return Boolean(window.localStorage.getItem(USER_LOCALE_KEY));
  } catch {
    return false;
  }
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      ...defaultPreferences,
      updatePreferences: (partial) =>
        set((s) => {
          const next = { ...s } as Record<string, unknown>;
          for (const [key, value] of Object.entries(partial)) {
            const existing = next[key];
            if (
              typeof value === 'object' &&
              value !== null &&
              !Array.isArray(value) &&
              typeof existing === 'object' &&
              existing !== null &&
              !Array.isArray(existing)
            ) {
              next[key] = { ...existing, ...value };
            } else {
              next[key] = value;
            }
          }
          return next as unknown as typeof s;
        }),
      setLayout: (layout) => set((s) => ({ app: { ...s.app, layout } })),
      setSidebarCollapsed: (collapsed) => {
        if (get().sidebar.collapsed === collapsed) return;
        set((s) => ({
          sidebar: { ...s.sidebar, collapsed },
        }));
      },

      toggleSidebar: () =>
        set((s) => ({
          sidebar: { ...s.sidebar, hidden: !s.sidebar.hidden },
        })),

      resetPreferences: () => set(() => structuredClone(defaultPreferences)),
    }),
    {
      name: PREFERENCES_STORAGE_KEY,

      partialize: (state) => {
        const {
          updatePreferences: _updatePreferences,
          setLayout: _setLayout,
          setSidebarCollapsed: _setSidebarCollapsed,
          toggleSidebar: _toggleSidebar,
          resetPreferences: _resetPreferences,
          ...rest
        } = state;
        return rest as typeof rest;
      },

      merge: (persisted, current) => {
        const merged = { ...current } as Record<string, unknown>;
        if (persisted && typeof persisted === 'object') {
          for (const [key, value] of Object.entries(
            persisted as Record<string, unknown>,
          )) {
            const existing = merged[key];
            if (
              typeof value === 'object' &&
              value !== null &&
              !Array.isArray(value) &&
              typeof existing === 'object' &&
              existing !== null &&
              !Array.isArray(existing)
            ) {
              merged[key] = {
                ...existing,
                ...(value as Record<string, unknown>),
              };
            } else {
              merged[key] = value;
            }
          }
        }
        return merged as unknown as typeof current;
      },
    },
  ),
);

export { defaultPreferences };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function applyConfigPreferences(prefs: Record<string, unknown>): void {
  if (Object.keys(prefs).length === 0) return;

  const keepUserLocale = hasUserChosenLocale();
  usePreferencesStore.setState((s) => {
    const next = { ...s } as Record<string, unknown>;
    for (const [key, value] of Object.entries(prefs)) {
      const existing = next[key];
      if (isPlainObject(existing) && isPlainObject(value)) {
        const group = { ...existing, ...value };
        if (key === 'app') {
          const rawLocale = (value as { locale?: unknown }).locale;
          if (rawLocale !== undefined) {
            group.locale =
              normalizeLocale(rawLocale) ??
              (existing as { locale?: unknown }).locale;
          }

          if (keepUserLocale) {
            group.locale = (existing as { locale?: unknown }).locale;
          }
        }
        next[key] = group;
      } else {
        next[key] = value;
      }
    }
    return next as unknown as typeof s;
  });
}
