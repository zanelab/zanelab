import { delay, http, HttpResponse } from 'msw';
import type { MenuItem } from '../types';
import { TOKEN_HEADER } from '../constants/auth';

export const mockUser = {
  id: 1,
  username: 'admin',
  nickname: '管理员',
  avatar: '',
};

const mockLoginResponse = {
  token: 'mock-access-token',
  userId: 1,
  name: '管理员',
  email: 'admin@example.com',
  phone: '',
};

export const mockMenus: MenuItem[] = [
  {
    id: 1,
    name: '首页',
    path: '/dashboard',
    component: 'dashboard',
    icon: 'home',
    i18nKey: 'menus.dashboard',
  },
  {
    id: 2,
    name: '组件示例',
    path: '/components',
    icon: 'components',
    i18nKey: 'menus.components.title',
    children: [
      {
        id: 21,
        name: '按钮',
        path: '/components/button',
        component: 'components/button',
        permission: 'demo:button:view',
        icon: 'button',
        i18nKey: 'menus.components.button',
      },
      {
        id: 22,
        name: '表格',
        path: '/components/table',
        component: 'components/table',
        permission: 'demo:table:view',
        icon: 'table',
        i18nKey: 'menus.components.table',
      },
    ],
  },
  {
    id: 3,
    name: '系统管理',
    path: '/system',
    appName: 'iam',
    icon: 'system',
    i18nKey: 'menus.system.title',
    children: [
      {
        id: 31,
        name: '用户管理',
        path: '/system/users',
        permission: 'system:user:list',
        i18nKey: 'menus.system.users',
      },
      {
        id: 32,
        name: '菜单管理',
        path: '/system/menus',
        permission: 'system:menu:list',
        i18nKey: 'menus.system.menus',
      },
      {
        id: 33,
        name: '角色管理',
        path: '/system/roles',
        i18nKey: 'menus.system.roles',
      },
    ],
  },
  {
    id: 4,
    name: '个人中心',
    path: '/profile',
    icon: 'user',
    menuType: 'user-dropdown',
    i18nKey: 'menus.profile.title',
    children: [
      {
        id: 41,
        name: '基本资料',
        path: '/profile/basic',
        component: 'profile/basic',
        i18nKey: 'menus.profile.basic',
        icon: 'svg:M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
      },
      {
        id: 42,
        name: '安全设置',
        path: '/profile/security',
        component: 'profile/security',
        i18nKey: 'menus.profile.security',
        icon: 'shield',
      },
    ],
  },
];

const mockRawMenus = [
  {
    id: 1,
    pid: 0,
    code: 'home',
    parent: 'root',
    name: '首页',
    component: 'dashboard',
    uri: '/dashboard',
    type: 'menu',
    sort: 0,
    icon: 'home',
    hidden: false,
    scopes: ['O'],
    menuType: 1,
    children: null,
  },
  {
    id: 2,
    pid: 0,
    code: 'components',
    parent: 'root',
    name: '组件示例',
    component: '',
    uri: '/components',
    type: 'group',
    sort: 1,
    icon: 'components',
    hidden: false,
    scopes: ['O'],
    menuType: 0,
    children: [
      {
        id: 21,
        pid: 2,
        code: 'button',
        parent: 'components',
        name: '按钮',
        component: 'components/button',
        uri: '/button',
        type: 'menu',
        sort: 1,
        icon: 'button',
        hidden: false,
        scopes: ['O'],
        menuType: 1,
        children: [
          {
            id: 211,
            pid: 21,
            code: 'btn_view',
            parent: 'button',
            name: '查看',
            component: 'BTN_VIEW',
            uri: '/button:view',
            type: 'button',
            sort: 1,
            icon: null,
            hidden: false,
            scopes: ['O'],
            menuType: 2,
            children: null,
          },
        ],
      },
      {
        id: 22,
        pid: 2,
        code: 'table',
        parent: 'components',
        name: '表格',
        component: 'components/table',
        uri: '/table',
        type: 'menu',
        sort: 2,
        icon: 'table',
        hidden: false,
        scopes: ['O'],
        menuType: 1,
        children: [
          {
            id: 221,
            pid: 22,
            code: 'tbl_view',
            parent: 'table',
            name: '查看',
            component: 'TBL_VIEW',
            uri: '/table:view',
            type: 'button',
            sort: 1,
            icon: null,
            hidden: false,
            scopes: ['O'],
            menuType: 2,
            children: null,
          },
        ],
      },
    ],
  },
  {
    id: 3,
    pid: 0,
    code: 'iam',
    parent: 'root',
    name: '系统管理',
    component: 'iam',
    uri: 'iam',
    type: 'app',
    sort: 3,
    icon: 'system',
    hidden: false,
    scopes: ['O'],
    menuType: 0,
    children: [
      {
        id: 31,
        pid: 3,
        code: 'users',
        parent: 'iam',
        name: '用户管理',
        component: '',
        uri: '/users',
        type: 'menu',
        sort: 1,
        icon: null,
        hidden: false,
        scopes: ['O'],
        menuType: 1,
        children: null,
      },
      {
        id: 32,
        pid: 3,
        code: 'menus',
        parent: 'iam',
        name: '菜单管理',
        component: '',
        uri: '/menus',
        type: 'menu',
        sort: 2,
        icon: null,
        hidden: false,
        scopes: ['O'],
        menuType: 1,
        children: null,
      },
      {
        id: 33,
        pid: 3,
        code: 'roles',
        parent: 'iam',
        name: '角色管理',
        component: '',
        uri: '/roles',
        type: 'menu',
        sort: 3,
        icon: null,
        hidden: false,
        scopes: ['O'],
        menuType: 1,
        children: null,
      },
    ],
  },
  {
    id: 4,
    pid: 0,
    code: 'profile',
    parent: 'root',
    name: '个人中心',
    component: '',
    uri: '/profile',
    type: 'group',
    sort: 4,
    icon: 'user',
    hidden: false,
    scopes: ['O'],
    menuType: 0,
    children: [
      {
        id: 41,
        pid: 4,
        code: 'basic',
        parent: 'profile',
        name: '基本资料',
        component: 'profile/basic',
        uri: '/profile/basic',
        type: 'menu',
        sort: 1,
        icon: 'svg:M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
        hidden: false,
        scopes: ['O'],
        menuType: 1,
        children: null,
      },
      {
        id: 42,
        pid: 4,
        code: 'security',
        parent: 'profile',
        name: '安全设置',
        component: 'profile/security',
        uri: '/profile/security',
        type: 'menu',
        sort: 2,
        icon: 'shield',
        hidden: false,
        scopes: ['O'],
        menuType: 1,
        children: null,
      },
    ],
  },
];

function checkPassword(encrypted: string): boolean {
  try {
    return atob(encrypted) === '123456';
  } catch {
    return true;
  }
}

export const handlers = [
  http.post('/sys/auth/login', async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };
    if (body.email === 'admin' && checkPassword(body.password ?? '')) {
      return HttpResponse.json({
        code: 0,
        data: mockLoginResponse,
        msg: 'ok',
      });
    }
    return HttpResponse.json({
      code: 10001,
      data: null,
      msg: '用户名或密码错误',
    });
  }),

  http.post('/sys/auth/logout', () =>
    HttpResponse.json({ code: 0, data: null, msg: 'ok' }),
  ),

  http.post('/sys/auth/refresh', async ({ request }) => {
    const body = (await request.json()) as { refreshToken?: string };
    if (body.refreshToken === 'mock-refresh-token') {
      return HttpResponse.json({
        code: 0,
        data: { token: 'mock-access-token-2' },
        msg: 'ok',
      });
    }
    return HttpResponse.json({ code: 10001, data: null, msg: '刷新令牌无效' });
  }),

  http.post('/sys/auth/otp', () =>
    HttpResponse.json({ code: 0, data: { success: true }, msg: 'ok' }),
  ),

  http.get('/api/user/info', () =>
    HttpResponse.json({ code: 0, data: mockUser, msg: 'ok' }),
  ),

  http.get('/sys/user/menus', () =>
    HttpResponse.json({ code: 0, data: mockRawMenus, msg: 'ok' }),
  ),

  http.get('/api/user/menus', () =>
    HttpResponse.json({ code: 0, data: mockRawMenus, msg: 'ok' }),
  ),

  http.get('/api/protected', ({ request }) => {
    const token = request.headers.get(TOKEN_HEADER);
    if (!token) {
      return new HttpResponse(null, { status: 401 });
    }
    return HttpResponse.json({ code: 0, data: { ok: true }, msg: 'ok' });
  }),
];
