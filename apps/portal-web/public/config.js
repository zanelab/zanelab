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
    loginPage: {
      layout: 'panel-center',
      showCodeLogin: false,
      showQrcodeLogin: false,
      showThirdPartyLogin: false,
      showRegister: false,
      showForgetPassword: false,
      showRememberMe: true,
      showColorToggle: false,
      showLayoutToggle: false,
    },
  },
  api: {
    baseURL: '',
    // loginEndpoint 是 schema 必填（@zanelab/types AppConfigSchema）——缺失会让
    // 整块 api 配置 zod 校验失败回退 DEFAULT_CONFIG（含 microApps 全空）。
    loginEndpoint: '/sys/auth/login',
    menusEndpoint: '/menu/tree',
    logoutEndpoint: '/auth/logout',
    refreshEndpoint: '/auth/refresh',
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
