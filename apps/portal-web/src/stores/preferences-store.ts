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

/**
 * usePreferencesStore — 等价参考实现 @core/preferences 的 PreferenceManager
 * （zustand persist 替代 StorageManager 缓存链路）。
 * 有意未移植的 manager 子功能（均无消费者）：preferences-locale /
 * preferences-theme 分离缓存键（port 单键 zanelab-preferences）、
 * initPlatform 的 dataset.platform 平台标识、customPreferences 扩展注册 API
 * （preferencesExtension/Custom 区块 —— port 无自定义偏好扩展面）。
 * DOM 副作用（CSS 变量 / data-theme / 颜色模式类）见
 * components/layouts/hooks/use-preferences-runtime.ts。
 */
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
    /** 偏好设置面板快捷键 */
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
  /** 重置到默认偏好（等价 preferencesManager.resetPreferences：整体重置并落缓存） */
  resetPreferences: () => void;
}

/** 深度 Partial — 等价于 上游的 DeepPartial<preferences> */
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
    // host 本地资源（public/logo.svg）——替换原 unpkg 外链，避免运行时外部依赖
    source: '/logo.svg',
    sourceDark: '',
  },
  copyright: {
    enable: true,
    // 版权公司名：留空 → 展示时按当前语言取系统名（config.js system.name / nameEn，
    // 见 locales/i18n.systemName）；填写后用填写值
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

/** 偏好持久化的 localStorage key（persist 与 hasUserChosenLocale 共用） */
const PREFERENCES_STORAGE_KEY = 'zanelab-preferences';

export const USER_LOCALE_KEY = 'zanelab_user_locale';
export const USER_THEME_KEY = 'zanelab_user_theme';

/**
 * 「用户显式切换过语言」的标记 key（值 = 用户选中的语言，下划线格式）。
 *
 * 不能拿偏好持久化里的 app.locale 判断：启动时 applyConfigPreferences 会写入
 * 整个偏好（含 app.locale），持久化里几乎总会有值，分不清是「config 默认」还是
 * 「用户选择」。故由 switchLocale() 显式打标（见 locales/i18n）。
 */
export function hasUserChosenLocale(): boolean {
  try {
    return Boolean(window.localStorage.getItem(USER_LOCALE_KEY));
  } catch {
    return false;
  }
}

/**
 * 「用户显式切换过主题」标记（与 USER_LOCALE_KEY 同款问题与方案）。
 *
 * 不能拿偏好持久化里的 theme.mode 判断：启动时 applyConfigPreferences 会写入
 * config 的 layout.theme，持久化里几乎总会有值，分不清「config 默认」还是
 * 「用户选择」。由 switchThemeMode 显式打标；打标后 config 只作默认值——
 * 否则切语言（整页刷新）后 bootstrap 又把用户主题压回 config 的 light。
 */
export function hasUserChosenTheme(): boolean {
  try {
    return Boolean(window.localStorage.getItem(USER_THEME_KEY));
  } catch {
    return false;
  }
}

/**
 * 用户是否显式切换过语言。
 *
 * 用于把 config.js 的 preferences.app.locale 限定为**部署期默认值**：
 * 用户切过语言时 config 不再覆盖（否则切完语言整页刷新又会被压回默认）。
 */
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
        // 幂等守卫（修复 React #185「Maximum update depth exceeded」）：
        // 值没变就不写 store。zustand 每次 set 都会生成新的 state 对象 → 整店订阅者
        // （BasicLayout 的 usePreferencesStore()）必然重渲染；只要调用方 effect 的依赖里
        // 含「每次渲染新建的函数/对象」，就会 render → set → render 无限循环。
        // 具体案例：上游布局组件 的 `[isMobile, onSetSidebarCollapsed]` effect。
        // 这里挡一层，保证同值重复调用不产生任何通知（调用方行为不变）。
        if (get().sidebar.collapsed === collapsed) return;
        set((s) => ({
          sidebar: { ...s.sidebar, collapsed },
        }));
      },

      // reference layout.vue:158-164 —— 切换 sidebar.hidden（隐藏/显示整条侧边栏），
      // 而非 collapsed（仅收起宽度）。移动端分支由 layout 的 handleHeaderToggle 处理。
      toggleSidebar: () =>
        set((s) => ({
          sidebar: { ...s.sidebar, hidden: !s.sidebar.hidden },
        })),

      // 等价 preferencesManager.resetPreferences：重置为初始默认值并触发落缓存
      resetPreferences: () => set(() => structuredClone(defaultPreferences)),
    }),
    {
      name: PREFERENCES_STORAGE_KEY,

      // 函数字段不落盘（persist 只存数据）
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

      // 有意差异：reference 以 useDebounceFn(saveToCache, 150) 落缓存；
      // zustand persist 每次 set 同步写入 localStorage。无防抖仅影响
      // 写入频率，用户可见行为一致。缓存优先语义 —— 用户保存的偏好在
      // 刷新后恢复，符合直觉行为。
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

/** 默认偏好（等价参考实现 defaultPreferences —— diffPreference/reset 的基准） */
export { defaultPreferences };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 应用部署期偏好覆盖（config.js 的 preferences）：按分组浅合并进 store，
 * 优先级高于本地缓存 —— 清空 localStorage 后依然生效（调用点见 main.tsx bootstrap）。
 * 分组内再浅合并一层，语义与 updatePreferences 一致；未提供的分组/字段保持现值。
 */
export function applyConfigPreferences(prefs: Record<string, unknown>): void {
  if (Object.keys(prefs).length === 0) return;

  const keepUserLocale = hasUserChosenLocale();
  const keepUserTheme = hasUserChosenTheme();
  usePreferencesStore.setState((s) => {
    const next = { ...s } as Record<string, unknown>;
    for (const [key, value] of Object.entries(prefs)) {
      const existing = next[key];
      if (isPlainObject(existing) && isPlainObject(value)) {
        const group = { ...existing, ...value };
        if (key === 'app') {
          // 语言（app.locale）例外：config 只作为「用户没选过语言时」的默认值。
          // 否则每次启动都会把用户切换的语言压回 config 值（切语言是整页刷新，
          // 刷新后立即被覆盖 → 用户永远切不过去，见 locales/i18n.switchLocale）。
          const rawLocale = (value as { locale?: unknown }).locale;
          if (rawLocale !== undefined) {
            // 兼容 config 里的下划线写法（zh_CN / en_US）→ 归一化后再入库，
            // 非法/非支持语言忽略（保持现值）
            group.locale =
              normalizeLocale(rawLocale) ??
              (existing as { locale?: unknown }).locale;
          }

          // 用户显式选择过语言 → config 只作默认值，不覆盖
          if (keepUserLocale) {
            group.locale = (existing as { locale?: unknown }).locale;
          }
        }
        if (key === 'theme' && keepUserTheme) {
          // 主题（theme.mode）同款例外：切语言走整页刷新（switchLocale），
          // 刷新后本函数把 config 的 layout.theme 写回 store 会把用户切换的
          // 主题压回亮色（实测：设暗色 → 切语言 → 回亮色）。打标后 config
          // 只作默认值，theme 整组以持久化值为准（其余 theme 字段同样别覆盖）。
          next[key] = existing;
          continue;
        }
        next[key] = group;
      } else {
        next[key] = value;
      }
    }
    return next as unknown as typeof s;
  });
}
