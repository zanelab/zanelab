import { delay, http, HttpResponse } from 'msw';
import {
  ROLES_LIST_PATH,
  ROLES_COLLECTION_PATH,
  ROLES_ITEM_PATH,
  ROLE_PERMISSIONS_PATH,
  INTEGRATION_PREFIX,
} from '../api/endpoints';
import type { RoleRecord } from '../api/roles';
import { allMenuPermissions } from './menu-handlers';
import { resolvePermissions, can } from './auth';

/*
 * iam 子应用角色 mock handler（角色授权的 mock 契约，与菜单/用户 mock 同模式）。
 *
 * 契约 = Edge Fn 角色端点：
 * - GET    /auth/roles                 → 角色列表（require system:role:list）
 * - POST   /roles                      → 新建（require system:role:create；code 唯一）
 * - PUT    /roles/:id                  → 编辑名（require system:role:update；内置 1019）
 * - DELETE /roles/:id                  → 删除（require system:role:delete；内置 1019）
 * - GET    /auth/roles/:id/permissions → 该角色已授权 permission 集合
 * - PUT    /auth/roles/:id/permissions → 全量替换授权（值域 = 菜单 permission 或 '*'）
 *
 * 身份判定：resolvePermissions(request)（admin '*' / 游客读码 / 匿名空），
 * 按权限码放行（requirePermission 同语义）。
 */

type RoleRow = { id: number; code: string; name: string; builtIn: boolean };

const seedRoles: RoleRow[] = [
  { id: 1, code: 'admin', name: '系统管理员', builtIn: true },
  { id: 2, code: 'guest', name: '游客', builtIn: true },
  // 非内置角色（角色页编辑/删除可用性的测试锚点；授权集合空 = 未授权）
  { id: 3, code: 'operator', name: '运营', builtIn: false },
];

/** 授权集合：admin 持 '*'；guest 初始授权公开菜单（home/iam 树）——模拟「新角色默认授权」 */
const seedPermissions = new Map<number, string[]>([
  [1, ['*']],
  [2, ['system:menu:list', 'system:user:list', 'system:role:list']],
]);

let roles = structuredClone(seedRoles);
let permissions = new Map(
  [...seedPermissions].map(([k, v]) => [k, [...v]] as [number, string[]]),
);
let nextRoleId = 1000;

const ok = (data: unknown) => HttpResponse.json({ code: 0, data, msg: 'ok' });
const fail = (code: number, msg: string, status = 400) =>
  HttpResponse.json({ code, data: null, msg }, { status });

const pagePaths = (p: string) => [p, `${INTEGRATION_PREFIX}${p}`];

const ROLE_BUILT_IN_MSG = '内置角色不允许编辑或删除';

export const iamRoleHandlers = [
  // GET 角色列表（require system:role:list）
  ...pagePaths(ROLES_LIST_PATH).map((path) =>
    http.get(path, async ({ request }) => {
      await delay(200);
      if (!can(resolvePermissions(request), 'system:role:list'))
        return fail(1011, '没有执行此操作的权限', 403);
      const list: RoleRecord[] = roles.map((r) => ({
        ...r,
        permissionCount: permissions.get(r.id)?.length ?? 0,
      }));
      return ok(list);
    }),
  ),

  // POST 新建角色（require system:role:create；code 唯一）
  ...pagePaths(ROLES_COLLECTION_PATH).map((path) =>
    http.post(path, async ({ request }) => {
      await delay(200);
      if (!can(resolvePermissions(request), 'system:role:create'))
        return fail(1011, '没有执行此操作的权限', 403);
      const body = (await request.json().catch(() => ({}))) as {
        code?: string;
        name?: string;
      };
      const code = String(body.code ?? '').trim();
      const name = String(body.name ?? '').trim();
      if (!code || !name) return fail(1001, '请求格式错误');
      if (roles.some((r) => r.code === code))
        return fail(1016, '角色编码已存在');
      const row: RoleRow = { id: ++nextRoleId, code, name, builtIn: false };
      roles.push(row);
      return ok(row);
    }),
  ),

  // PUT 编辑角色名（require system:role:update；内置 1019）
  ...pagePaths(ROLES_ITEM_PATH(':id')).map((path) =>
    http.put(path, async ({ request, params }) => {
      await delay(200);
      if (!can(resolvePermissions(request), 'system:role:update'))
        return fail(1011, '没有执行此操作的权限', 403);
      const row = roles.find((r) => r.id === Number(params['id']));
      if (!row) return fail(1013, '角色不存在', 404);
      if (row.builtIn) return fail(1019, ROLE_BUILT_IN_MSG);
      const body = (await request.json().catch(() => ({}))) as {
        name?: string;
      };
      const name = String(body.name ?? '').trim();
      if (!name) return fail(1001, '请求格式错误');
      row.name = name;
      return ok(row);
    }),
  ),

  // DELETE 删除角色（require system:role:delete；内置 1019；级联清授权）
  ...pagePaths(ROLES_ITEM_PATH(':id')).map((path) =>
    http.delete(path, async ({ request, params }) => {
      await delay(200);
      if (!can(resolvePermissions(request), 'system:role:delete'))
        return fail(1011, '没有执行此操作的权限', 403);
      const id = Number(params['id']);
      const row = roles.find((r) => r.id === id);
      if (!row) return fail(1013, '角色不存在', 404);
      if (row.builtIn) return fail(1019, ROLE_BUILT_IN_MSG);
      roles = roles.filter((r) => r.id !== id);
      permissions.delete(id);
      return ok({ id });
    }),
  ),

  // GET 角色授权集合（require system:role:list）
  ...pagePaths(ROLE_PERMISSIONS_PATH(':id')).map((path) =>
    http.get(path, async ({ request, params }) => {
      await delay(200);
      if (!can(resolvePermissions(request), 'system:role:list'))
        return fail(1011, '没有执行此操作的权限', 403);
      const id = Number(params['id']);
      if (!roles.some((r) => r.id === id)) return fail(1013, '角色不存在', 404);
      return ok(permissions.get(id) ?? []);
    }),
  ),

  // PUT 全量替换授权（require system:role:assign；值域校验）
  ...pagePaths(ROLE_PERMISSIONS_PATH(':id')).map((path) =>
    http.put(path, async ({ request, params }) => {
      await delay(200);
      if (!can(resolvePermissions(request), 'system:role:assign'))
        return fail(1011, '没有执行此操作的权限', 403);
      const id = Number(params['id']);
      if (!roles.some((r) => r.id === id)) return fail(1013, '角色不存在', 404);
      const body = (await request.json().catch(() => ({}))) as {
        permissions?: string[];
      };
      const perms = body.permissions ?? [];
      if (!perms.length) return fail(1018, '请至少勾选一个授权菜单');
      const valid = new Set(allMenuPermissions());
      if (perms.some((p) => p !== '*' && !valid.has(p)))
        return fail(1016, '角色编码无效');
      permissions.set(id, [...perms]);
      return ok({ id, permissions: perms });
    }),
  ),
];

export function resetRoleMock(): void {
  roles = structuredClone(seedRoles);
  permissions = new Map(
    [...seedPermissions].map(([k, v]) => [k, [...v]] as [number, string[]]),
  );
  nextRoleId = 1000;
}
