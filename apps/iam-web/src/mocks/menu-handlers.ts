import { delay, http, HttpResponse } from 'msw';
import {
  MENUS_LIST_PATH,
  MENUS_COLLECTION_PATH,
  MENUS_ITEM_PATH,
  INTEGRATION_PREFIX,
} from '../api/endpoints';
import type { MenuItemRecord } from '../api/menus';

/*
 * iam 子应用菜单 mock handler（iam 自身接口的 mock 契约，design DD6）。
 *
 * 契约 = Edge Fn 菜单端点（supabase/functions/iam/index.ts 菜单节）：
 * - envelope { code, data, msg }，code 0 成功
 * - GET    /auth/menus              → 游客子集（无/无效 JWT）或按权限全量树
 * - POST   /menus                   → 新建（仅 admin）
 * - PUT    /menus/:id               → 更新（仅 admin）
 * - DELETE /menus/:id               → 删除（级联子树，仅 admin）
 *
 * 身份模拟（README「mock 路线」节）：handler 读 Authorization 头——
 * - 无 / Bearer mock-guest：游客子集 + 写操作 403
 * - Bearer mock-admin：全量 + 写操作成功
 * 独立态切换身份：devtools 里 localStorage.iam_token = 'mock-admin' 后刷新。
 *
 * 路径派生：与 otp-handlers 同模式（pagePaths），常量来自 api/endpoints.ts，
 * 路径漂移在结构上不可能（design DD5 的既有决策）。
 */

/** 种子数据：与 portal mock 的菜单树同款（apps/portal-web/src/mocks/handlers.ts mockRawMenus），
 *  字段取任务 11-04 修订契约（scopes=A/C 适用范围，C=游客可见）；首页公开，iam 域同样公开但管理操作要 admin。 */
let seedId = 1000;
const seedMenus: MenuItemRecord[] = [
  {
    id: 1,
    pid: null,
    code: 'home',
    name: '首页',
    component: null,
    uri: '/home',
    type: 'menu',
    sort: 0,
    icon: 'home',
    activeIcon: 'home-active',
    hidden: false,
    scopes: ['C'],
    children: null,
  },
  {
    id: 3,
    pid: null,
    code: 'iam',
    name: '系统管理',
    component: 'iam',
    uri: '/iam',
    type: 'app',
    sort: 3,
    icon: 'system',
    activeIcon: 'system-active',
    hidden: false,
    scopes: ['C'],
    children: [
      {
        id: 31,
        pid: 3,
        code: 'users',
        name: '用户管理',
        component: null,
        uri: '/users',
        type: 'menu',
        sort: 1,
        icon: null,
        activeIcon: null,
        hidden: false,
        scopes: ['C'],
        children: null,
      },
      {
        id: 32,
        pid: 3,
        code: 'menus',
        name: '菜单管理',
        component: null,
        uri: '/menus',
        type: 'menu',
        sort: 2,
        icon: null,
        activeIcon: null,
        hidden: false,
        scopes: ['C'],
        children: null,
      },
    ],
  },
];

let menus: MenuItemRecord[] = structuredClone(seedMenus);

const ok = (data: unknown) => HttpResponse.json({ code: 0, data, msg: 'ok' });
const fail = (code: number, msg: string, status = 400) =>
  HttpResponse.json({ code, data: null, msg }, { status });

/** 集成态页面 fetch 带 /iam 前缀（SW 拦截在宿主 proxy rewrite 之前），两种路径形态都登记。 */
const pagePaths = (p: string) => [p, `${INTEGRATION_PREFIX}${p}`];

function identity(request: Request): 'admin' | 'guest' {
  const auth = request.headers.get('authorization') ?? '';
  return auth === 'Bearer mock-admin' ? 'admin' : 'guest';
}

/** 类型联动矩阵（与页面 TYPE_MATRIX / Edge Fn TYPE_FIELD_MATRIX 同语义）。 */
const TYPE_MATRIX: Record<
  MenuItemRecord['type'],
  {
    uri: 'required' | 'hidden';
    component: boolean;
    icon: boolean;
    needsPid: boolean;
  }
> = {
  app: { uri: 'required', component: true, icon: true, needsPid: false },
  group: { uri: 'hidden', component: false, icon: false, needsPid: true },
  menu: { uri: 'required', component: true, icon: true, needsPid: true },
  button: { uri: 'hidden', component: false, icon: false, needsPid: true },
};

/** 按矩阵校验写请求体；违例返回中文 msg（与 Edge Fn 1014 语义一致）。 */
function validateType(body: Record<string, unknown>): string | null {
  const type = (body.type as MenuItemRecord['type']) ?? 'app';
  const matrix = TYPE_MATRIX[type] ?? TYPE_MATRIX.app;
  const scopes = body.scopes as string[] | undefined;
  if (!scopes || scopes.length === 0) return '请至少选择一个适用范围';
  if (scopes.some((sc) => sc !== 'A' && sc !== 'C'))
    return '适用范围值无效（仅 A/C）';
  if (matrix.uri === 'required' && !String(body.uri ?? '').trim())
    return '该类型必须填写路由';
  if (matrix.needsPid && (body.pid == null || Number.isNaN(Number(body.pid))))
    return '该类型必须选择父级菜单';
  return null;
}

/** 树 → 平铺（引用共享，直接改内存里的对象）。 */
function flatten(tree: MenuItemRecord[]): MenuItemRecord[] {
  return tree.flatMap((n) => [n, ...flatten(n.children ?? [])]);
}

/** 游客可见过滤（对齐 Edge Fn 11-04 规则）：hidden=false + scopes 含 C + 非 button + 祖先链。 */
function guestView(tree: MenuItemRecord[]): MenuItemRecord[] {
  const flat = flatten(tree);
  const byId = new Map(flat.map((n) => [n.id, n]));
  const visible = new Set<number>();
  const keep = (n: MenuItemRecord) => {
    if (visible.has(n.id)) return;
    visible.add(n.id);
    if (n.pid != null) {
      const parent = byId.get(n.pid);
      if (parent) keep(parent);
    }
  };
  for (const n of flat) {
    if (!n.hidden && n.scopes.includes('C') && n.type !== 'button') keep(n);
  }
  const prune = (nodes: MenuItemRecord[]): MenuItemRecord[] =>
    nodes
      .filter((n) => visible.has(n.id))
      .map((n) => ({
        ...n,
        children: n.children?.length ? prune(n.children) : null,
      }));
  return prune(tree);
}

/** 级联删除：返回过滤后的新树。 */
function removeDeep(tree: MenuItemRecord[], id: number): MenuItemRecord[] {
  return tree
    .filter((n) => n.id !== id)
    .map((n) => ({
      ...n,
      children: n.children?.length ? removeDeep(n.children, id) : null,
    }));
}

/** pid 深度：用于新建节点挂树（内存模拟不做成环校验，与 Edge Fn MVP 一致）。 */
function attach(tree: MenuItemRecord[], node: MenuItemRecord): boolean {
  if (node.pid == null) {
    tree.push(node);
    return true;
  }
  for (const n of tree) {
    if (n.id === node.pid) {
      n.children = [...(n.children ?? []), node];
      return true;
    }
    if (n.children && attach(n.children, node)) return true;
  }
  return false;
}

export const iamMenuHandlers = [
  // GET 列表（匿名/游客 → 子集；mock-admin → 全量）
  ...pagePaths(MENUS_LIST_PATH).map((path) =>
    http.get(path, async ({ request }) => {
      await delay(200);
      return ok(identity(request) === 'admin' ? menus : guestView(menus));
    }),
  ),

  // POST 新建（仅 admin）
  ...pagePaths(MENUS_COLLECTION_PATH).map((path) =>
    http.post(path, async ({ request }) => {
      await delay(200);
      if (identity(request) !== 'admin')
        return fail(1011, '没有执行此操作的权限', 403);
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      if (!body?.name || !body?.code) return fail(1001, '请求格式错误');
      const typeErr = validateType(body);
      if (typeErr) return fail(1014, typeErr);
      if (flatten(menus).some((n) => n.code === body.code))
        return fail(1012, '菜单编码已存在');
      const type = (body.type as MenuItemRecord['type']) ?? 'app';
      const matrix = TYPE_MATRIX[type];
      const node: MenuItemRecord = {
        id: ++seedId,
        pid: (body.pid as number | null) ?? null,
        code: String(body.code),
        name: String(body.name),
        component: matrix.component
          ? ((body.component as string | null) ?? null)
          : null,
        uri:
          matrix.uri === 'hidden'
            ? null
            : ((body.uri as string | null) ?? null),
        type,
        sort: Number(body.sort) || 0,
        icon: matrix.icon ? ((body.icon as string | null) ?? null) : null,
        activeIcon: matrix.icon
          ? ((body.activeIcon as string | null) ?? null)
          : null,
        hidden: !!body.hidden,
        scopes: (body.scopes as ('A' | 'C')[]) ?? ['C'],
        children: null,
      };
      attach(menus, node);
      return ok(node);
    }),
  ),

  // PUT 更新（仅 admin）
  ...pagePaths(MENUS_ITEM_PATH(':id')).map((path) =>
    http.put(path, async ({ request, params }) => {
      await delay(200);
      if (identity(request) !== 'admin')
        return fail(1011, '没有执行此操作的权限', 403);
      const id = Number(params['id']);
      const row = flatten(menus).find((n) => n.id === id);
      if (!row) return fail(1013, '菜单不存在', 404);
      const body = (await request.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (
        body.code &&
        body.code !== row.code &&
        flatten(menus).some((n) => n.code === body.code)
      )
        return fail(1012, '菜单编码已存在');
      // 部分更新：body 缺省的字段沿用行上现值，再过矩阵校验（与 Edge Fn 语义一致）
      const effective = {
        uri: body.uri !== undefined ? body.uri : row.uri,
        pid: body.pid !== undefined ? body.pid : row.pid,
        scopes: body.scopes !== undefined ? body.scopes : row.scopes,
        type: body.type !== undefined ? body.type : row.type,
      };
      const typeErr = validateType(effective);
      if (typeErr) return fail(1014, typeErr);
      const type = effective.type as MenuItemRecord['type'];
      const matrix = TYPE_MATRIX[type] ?? TYPE_MATRIX.app;
      Object.assign(row, {
        name: body.name !== undefined ? String(body.name) : row.name,
        code: body.code !== undefined ? String(body.code) : row.code,
        component:
          body.component !== undefined
            ? matrix.component
              ? body.component
              : null
            : row.component,
        uri:
          body.uri !== undefined
            ? matrix.uri === 'hidden'
              ? null
              : body.uri
            : row.uri,
        type,
        sort: body.sort !== undefined ? Number(body.sort) : row.sort,
        icon:
          body.icon !== undefined ? (matrix.icon ? body.icon : null) : row.icon,
        activeIcon:
          body.activeIcon !== undefined
            ? matrix.icon
              ? body.activeIcon
              : null
            : row.activeIcon,
        hidden: body.hidden !== undefined ? !!body.hidden : row.hidden,
        scopes: body.scopes !== undefined ? body.scopes : row.scopes,
      });
      return ok(row);
    }),
  ),

  // DELETE 删除（级联，仅 admin）
  ...pagePaths(MENUS_ITEM_PATH(':id')).map((path) =>
    http.delete(path, async ({ request, params }) => {
      await delay(200);
      if (identity(request) !== 'admin')
        return fail(1011, '没有执行此操作的权限', 403);
      const id = Number(params['id']);
      if (!flatten(menus).some((n) => n.id === id))
        return fail(1013, '菜单不存在', 404);
      menus = removeDeep(menus, id);
      return ok({ id });
    }),
  ),
];

/** 测试重置：恢复种子数据（vitest afterEach 里调）。 */
export function resetMenuMock(): void {
  menus = structuredClone(seedMenus);
  seedId = 1000;
}
