import { afterEach, describe, expect, it } from 'vitest';
import { appConfig } from '../config';
import { isAuthPath, isPublicSubAppPath } from './auth-path';

afterEach(() => {
  appConfig.microApps = {};
});

describe('isAuthPath', () => {
  it('loginPath 用 startsWith 匹配（子应用登录页子路径属于认证路径）', () => {
    appConfig.auth.loginPath = '/iam/login';
    expect(isAuthPath('/iam/login')).toBe(true);
    expect(isAuthPath('/iam/login/sso')).toBe(true);
    expect(isAuthPath('/iam/users')).toBe(false);
    expect(isAuthPath('/auth/register')).toBe(true);
    expect(isAuthPath('/lock')).toBe(true);
    expect(isAuthPath('/home')).toBe(false);
  });
});

describe('isPublicSubAppPath', () => {
  it('public: true —— 整个 activeRule 前缀免鉴权', () => {
    appConfig.microApps = {
      iam: {
        name: 'iam',
        entry: '//localhost:8081',
        container: '#c',
        activeRule: '/iam',
        props: {},
        prefetch: false,
        public: true,
      },
    };
    expect(isPublicSubAppPath('/iam/login')).toBe(true);
    expect(isPublicSubAppPath('/iam/users')).toBe(true);
    expect(isPublicSubAppPath('/home')).toBe(false);
  });

  it('public: string[] —— 仅列出的子路径免鉴权', () => {
    appConfig.microApps = {
      home: {
        name: 'home',
        entry: '//localhost:8083',
        container: '#c',
        activeRule: '/home',
        props: {},
        prefetch: false,
        public: ['/home'],
      },
    };
    expect(isPublicSubAppPath('/home')).toBe(true);
    expect(isPublicSubAppPath('/home/other')).toBe(true);
  });

  it('public: false —— 不免鉴权', () => {
    appConfig.microApps = {
      iam: {
        name: 'iam',
        entry: '//localhost:8081',
        container: '#c',
        activeRule: '/iam',
        props: {},
        prefetch: false,
        public: false,
      },
    };
    expect(isPublicSubAppPath('/iam/login')).toBe(false);
  });

  it('homePath 免鉴权判定（未登录访问 / 时导去 homePath 的依据）', () => {
    appConfig.microApps = {
      home: {
        name: 'home',
        entry: '//localhost:8083',
        container: '#c',
        activeRule: '/home',
        props: {},
        prefetch: false,
        public: ['/home'],
      },
    };
    appConfig.route.homePath = '/home';
    expect(isPublicSubAppPath(appConfig.route.homePath)).toBe(true);
  });
});
