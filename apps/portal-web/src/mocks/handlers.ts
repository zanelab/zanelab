import { delay, http, HttpResponse } from 'msw';
import type { MenuItem } from '../types';
import { TOKEN_HEADER } from '../constants/auth';

// MSW mock 契约（docs/技术方案.md §4/§10，父级 design §4）。
// MVP 无后端：这些 handler 让 host 的登录/菜单链路可独立运行。
// 统一响应体 { code, data, msg }，code===0 为成功。
//
// 登录参数已迁移为旧项目契约 { loginChanel, email, password, code }，
// 密码经 encryptPassword 加密（base64 或 SM4-ECB）。mock 侧 base64 解码
// 校验明文；SM4 密文 atob 会抛错 → 放行（dev 模式仅验证 UI 流程）。

/** 旧项目登录响应体（LoginResponseVO） */
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
    path: '/home',
    icon: 'home',
    type: 'menu',
  },
  {
    id: 3,
    name: '系统管理',
    path: '/iam',
    icon: 'system',
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
 * 旧后端原始菜单格式（/user/menu/tree 返回结构）。
 * fetchMenus 内 transformMenu 转换为项目 MenuItem 格式。
 * 结构与 mockMenus 一致，用原始字段名（uri/type/menuType 数字）。
 */
const mockRawMenus = [
  {
    id: 1,
    pid: 0,
    code: 'home',
    parent: 'root',
    name: '首页',
    component: '',
    uri: '/home',
    type: 'menu',
    sort: 0,
    icon: 'home',
    hidden: false,
    scopes: ['O'],
    menuType: 1,
    children: null,
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
        children: [
          {
            id: 311,
            pid: 31,
            code: 'user_list',
            parent: 'users',
            name: '查看',
            component: 'USER_LIST',
            uri: 'system:user:list',
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
        children: [
          {
            id: 321,
            pid: 32,
            code: 'menu_list',
            parent: 'menus',
            name: '查看',
            component: 'MENU_LIST',
            uri: 'system:menu:list',
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

  // 登出
  http.post('/sys/auth/logout', () =>
    HttpResponse.json({ code: 0, data: null, msg: 'ok' }),
  ),

  // Token 刷新
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

  // 按身份返回菜单：无 token → 公开子集（home）；有 token → 全量
  http.get('/sys/user/menus', ({ request }) => {
    const token = request.headers.get(TOKEN_HEADER);
    return HttpResponse.json({
      code: 0,
      data: token ? mockRawMenus : mockPublicRawMenus,
      msg: 'ok',
    });
  }),

  // 旧格式菜单端点（DEFAULT_CONFIG 兼容测试）
  http.get('/api/user/menus', ({ request }) => {
    const token = request.headers.get(TOKEN_HEADER);
    return HttpResponse.json({
      code: 0,
      data: token ? mockRawMenus : mockPublicRawMenus,
      msg: 'ok',
    });
  }),

  // 需要登录态保护的示例端点：无令牌返回 401（用于 401 单飞集成用例）
  http.get('/api/protected', ({ request }) => {
    const token = request.headers.get(TOKEN_HEADER);
    if (!token) {
      return new HttpResponse(null, { status: 401 });
    }
    return HttpResponse.json({ code: 0, data: { ok: true }, msg: 'ok' });
  }),
];
