import { delay, http, HttpResponse } from 'msw';
import type { MenuItem } from '../types';

// MSW mock 契约（docs/技术方案.md §4/§10，父级 design §4）。
// 统一响应体 { code, data, msg }，code===0 为成功。
//
// 端点已切 iam Edge Fn（任务 11-06）：menu/refresh/logout 的 mock 路径跟随
// config.js 新端点（/iam/functions/v1/iam/auth/*），body 契约对齐 iam。
// 登录 handler（/sys/auth/login）已废弃——登录走 iam OTP，authApi.login 无消费者。
//
// 注意：本 worker 只登记**宿主自身**的 mock 路由。子应用（iam）接口的
// mock 不在这里——宿主调子应用接口一律经配置代理转发到子应用自己的
// dev server（集成态 iam OTP mock 由 iam-web 自建 worker 拦截，
// 见 apps/iam-web/README.md mock 一节），宿主不代子应用持有 mock 契约。

/** 旧项目登录响应体（LoginResponseVO）+ mock 侧补的 refreshToken */
const mockLoginResponse = {
  token: 'mock-access-token',
  // 与 /sys/auth/refresh handler 的校验值一致——打通 401 单飞刷新链路
  // （旧后端契约无此字段，mock 补上让刷新可演练；mapLoginResult 透传）
  refreshToken: 'mock-refresh-token',
  userId: 1,
  name: '管理员',
  email: 'admin@example.com',
  phone: '',
};

export const mockMenus: MenuItem[] = [
  {
    id: 1,
    name: '首页',
    path: '/home',
    icon: 'home',
    activeIcon: 'home-active',
    type: 'menu',
  },
  {
    id: 3,
    name: '系统管理',
    path: '/iam',
    icon: 'system',
    activeIcon: 'system-active',
    appName: 'iam',
    type: 'app',
    children: [
      {
        id: 31,
        name: '用户管理',
        path: '/iam/users',
        appName: 'iam',
        type: 'menu',
        children: [
          {
            id: 311,
            name: '查看',
            path: '',
            permission: 'system:user:list',
          },
        ],
      },
      {
        id: 32,
        name: '菜单管理',
        path: '/iam/menus',
        appName: 'iam',
        type: 'menu',
        children: [
          {
            id: 321,
            name: '查看',
            path: '',
            permission: 'system:menu:list',
          },
        ],
      },
      {
        id: 33,
        name: '角色管理',
        path: '/iam/roles',
        appName: 'iam',
        type: 'menu',
      },
    ],
  },
];

/**
 * 菜单原始格式（iam Edge Fn GET /auth/menus 返回结构，任务 11-06 切换后）。
 * fetchMenus 内 transformMenu 转换为项目 MenuItem 格式。
 * 新契约要点：无 parent/menuType；scopes = A/C；permission = 语义权限码（菜单=进入码、按钮=操作码、空=公开）；
 * app 的 component = 子应用注册键（home/iam）、uri = 默认落点路由。
 */
const mockRawMenus = [
  {
    id: 1,
    pid: null,
    permission: null,
    name: '首页',
    component: null,
    uri: '/home',
    type: 'menu',
    sort: 0,
    icon: 'home',
    active_icon: 'home-active',
    hidden: false,
    scopes: ['C'],
    children: null,
  },
  {
    id: 3,
    pid: null,
    permission: null,
    name: '系统管理',
    component: 'iam',
    uri: '/iam',
    type: 'app',
    sort: 3,
    icon: 'system',
    active_icon: 'system-active',
    hidden: false,
    scopes: ['C'],
    children: [
      {
        id: 31,
        pid: 3,
        permission: 'system:user:list',
        name: '用户管理',
        component: null,
        uri: '/users',
        type: 'menu',
        sort: 1,
        icon: null,
        active_icon: null,
        hidden: false,
        scopes: ['C'],
        children: [
          {
            id: 311,
            pid: 31,
            permission: 'system:user:list',
            name: '查看',
            component: null,
            uri: null,
            type: 'button',
            sort: 1,
            icon: null,
            active_icon: null,
            hidden: false,
            scopes: ['A'],
            children: null,
          },
        ],
      },
      {
        id: 32,
        pid: 3,
        permission: 'system:menu:list',
        name: '菜单管理',
        component: null,
        uri: '/menus',
        type: 'menu',
        sort: 2,
        icon: null,
        active_icon: null,
        hidden: false,
        scopes: ['C'],
        children: [
          {
            id: 321,
            pid: 32,
            permission: 'system:menu:list',
            name: '查看',
            component: null,
            uri: null,
            type: 'button',
            sort: 1,
            icon: null,
            active_icon: null,
            hidden: false,
            scopes: ['A'],
            children: null,
          },
        ],
      },
      {
        id: 33,
        pid: 3,
        permission: 'system:role:list',
        name: '角色管理',
        component: null,
        uri: '/roles',
        type: 'menu',
        sort: 3,
        icon: null,
        active_icon: null,
        hidden: false,
        scopes: ['C'],
        children: null,
      },
    ],
  },
];

// 公开菜单子集：未登录可访问的项（home）
const mockPublicRawMenus = [mockRawMenus[0]];

/**
 * 校验加密密码：优先 base64 解码比对明文，SM4 密文 atob 会抛错 → 放行（dev）。
 */
function checkPassword(encrypted: string): boolean {
  try {
    return atob(encrypted) === '123456';
  } catch {
    // SM4 密文非合法 base64，dev 模式仅验证 email 即可
    return true;
  }
}

export const handlers = [
  // 登录（旧项目真实端点 /sys/auth/login）
  http.post('/sys/auth/login', async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };
    if (body.username === 'admin' && checkPassword(body.password ?? '')) {
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

  // 登出（端点切 iam /auth/logout——GoTrue signOut；mock 恒成功）
  http.post('/iam/functions/v1/iam/auth/logout', () =>
    HttpResponse.json({ code: 0, data: { success: true }, msg: 'ok' }),
  ),

  // Token 刷新（端点切 iam /auth/refresh——GoTrue 轮换，双 token 下发；
  // 宿主 refreshToken 函数据此覆盖本地 refreshToken）
  http.post('/iam/functions/v1/iam/auth/refresh', async ({ request }) => {
    const body = (await request.json()) as { refreshToken?: string };
    if (body.refreshToken === 'mock-refresh-token') {
      return HttpResponse.json({
        code: 0,
        data: {
          token: 'mock-access-token-2',
          refreshToken: 'mock-refresh-token',
        },
        msg: 'ok',
      });
    }
    return HttpResponse.json({ code: 1004, data: null, msg: '登录已过期' });
  }),

  // 菜单：按身份返回——无 token → 公开子集（home）；有 token → 全量。
  // 登记路径 = config.js 的 menusEndpoint（切 iam /auth/menus 后）。
  http.get('/iam/functions/v1/iam/auth/menus', ({ request }) => {
    const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
    return HttpResponse.json({
      code: 0,
      data: token ? mockRawMenus : mockPublicRawMenus,
      msg: 'ok',
    });
  }),

  // 需登录态的示例端点：无 token → 401。仅供手动 dev 演练（curl/控制台 fetch）；
  // http.401.test 的用例全部 server.use 覆写自建行为，不依赖此基线 handler。
  http.get('/api/protected', ({ request }) => {
    const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
    if (!token) {
      return new HttpResponse(null, { status: 401 });
    }
    return HttpResponse.json({ code: 0, data: { ok: true }, msg: 'ok' });
  }),
];
