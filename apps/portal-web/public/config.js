window.__APP_CONFIG__ = {
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
  api: {
    baseURL: '/auth/api/v1',
    menusEndpoint: '/user/menu/tree',
    userInfoEndpoint: '/sys/user/info',
    loginEndpoint: '/sys/auth/login',
    logoutEndpoint: '/sys/auth/logout',
    refreshEndpoint: '/sys/auth/refresh',
    otpEndpoint: '/sys/auth/otp',
    userPerEndpoint: '/home/user/getUserPer',
    powerAgentEndpoint: '/share/findPowerAgent',
    useMock: false,
  },
  route: {
    homePath: '/dashboard',
    forbiddenPath: '/403',
    notFoundPath: '/404',
  },

  layout: {
    theme: 'light',
    layout: 'header-nav',
    authPageLayout: 'panel-center',
    fixedHeader: true,
    showBreadcrumb: true,
  },

  preferences: {
    app: {
      locale: 'zh-CN',
      enablePreferences: false,
    },
    tabbar: {
      enable: false,
    },
    widget: {
      sidebarToggle: false,
      lockScreen: false,
      fullscreen: false,

      languageToggle: true,
      refresh: false,
      themeToggle: false,
      notification: false,
      timezone: false,
    },
    shortcutKeys: {
      enable: false,
      globalSearch: false,
      globalLockScreen: false,
    },
  },

  session: {
    showPlatformManagement: true,

    showTenantManagement: true,

    showTenantSwitcher: true,
  },

  icons: {
    chart: {
      viewBox: '0 0 24 24',
      paths: ['M3 3v18h18', 'M7 16v-5', 'M12 16V8', 'M17 16v-9'],
    },
  },

  iconPackUrl: '/icons/pack.json',

  i18n: {
    packUrls: {},
  },
  microApps: {
    iam: {
      name: 'iam',
      entry: '//localhost:8081',
      container: '#subapp-container',
      activeRule: '/iam',
      props: {},
      prefetch: true,
    },
  },
};
