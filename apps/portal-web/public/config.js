window.__APP_CONFIG__ = {
  version: '20250907',
  system: {
    name: 'ZaneLab',
    nameEn: 'ZaneLab',
    logo: '/logo.svg',
    favicon: '/favicon.ico',
  },
  auth: {
    loginPath: '/iam/login',
    tokenKey: 'portal_token',
    refreshTokenKey: 'portal_refresh_token',
  },
  api: {
    baseURL: '',
    menusEndpoint: '/iam/functions/v1/iam/auth/menus',
    logoutEndpoint: '/iam/functions/v1/iam/auth/logout',
    refreshEndpoint: '/iam/functions/v1/iam/auth/refresh',
    apiKey: 'sb_publishable_mLaIc7HxpEB3Ky6GMkkZRw_wm3-7uC8',
  },
  route: {
    homePath: '/home',
    forbiddenPath: '/403',
    notFoundPath: '/404',
  },

  layout: {
    theme: 'light',
    layout: 'header-nav',
    fixedHeader: true,
    showBreadcrumb: true,
  },

  preferences: {
    app: {
      locale: 'zh-CN',
      enablePreferences: true,
    },
    tabbar: {
      enable: false,
    },
    widget: {
      sidebarToggle: false,
      lockScreen: false,
      fullscreen: true,

      languageToggle: true,
      refresh: false,
      themeToggle: true,
      notification: true,
      timezone: true,
    },
    shortcutKeys: {
      enable: true,
      globalSearch: true,
      globalLockScreen: true,
    },
  },

  icons: {
    chart: {
      viewBox: '0 0 24 24',
      paths: ['M3 3v18h18', 'M7 16v-5', 'M12 16V8', 'M17 16v-9'],
    },
  },
  iconPackUrl: '/icons/pack.json',
  i18n: {
    packUrls: {

    },
  },
  microApps: {
    'home': {
      name: 'home',
      entry: '//localhost:8083',
      container: '#subapp-home-container',
      activeRule: '/home',
      props: {},
      public: ['/home'],
      prefetch: true,
    },
    'iam': {
      name: 'iam',
      entry: '//localhost:8081',
      container: '#subapp-iam-container',
      activeRule: '/iam',
      props: {},
      public: true,
      prefetch: true,
    },
  },
};
