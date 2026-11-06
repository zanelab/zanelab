import { delay, http, HttpResponse } from 'msw';
import {
  ROLES_LIST_PATH,
  ROLE_PERMISSIONS_PATH,
  INTEGRATION_PREFIX,
} from '../api/endpoints';
import type { RoleRecord } from '../api/roles';
import { allMenuCodes } from './menu-handlers';

/*
 * iam 子应用角色 mock handler（角色授权的 mock 契约，与菜单/用户 mock 同模式）。
 *
 * 契约 = Edge Fn 角色端点：
 * - GET  /auth/roles                        → 角色列表（admin-only）
 * - GET  /auth/roles/:id/permissions        → 该角色已授权 code 集合
 * - PUT  /auth/roles/:id/permissions        → 全量替换授权（值域校验 = 菜单 code 或 '*'）
 *
 * 身份判定同款：Bearer mock-admin = admin，其余 = 游客。
 */

const seedRoles: { id: number; code: string; name: string }[] = [
  { id: 1, code: 'admin', name: '系统管理员' },
  { id: 2, code: 'guest', name: '游客' },
];

/** 授权集合：admin 持 '*'；guest 初始授权公开菜单（home/iam 树）——模拟「新角色默认授权」 */
const seedPermissions = new Map<number, string[]>([
  [1, ['*']],
  [2, ['home', 'iam', 'users', 'menus']],
]);

let roles = structuredClone(seedRoles);
let permissions = new Map(
  [...seedPermissions].map(([k, v]) => [k, [...v]] as [number, string[]]),
);

const ok = (data: unknown) => HttpResponse.json({ code: 0, data, msg: 'ok' });
const fail = (code: number, msg: string, status = 400) =>
  HttpResponse.json({ code, data: null, msg }, { status });

const pagePaths = (p: string) => [p, `${INTEGRATION_PREFIX}${p}`];

function identity(request: Request): 'admin' | 'guest' {
  const auth = request.headers.get('authorization') ?? '';
  return auth === 'Bearer mock-admin' ? 'admin' : 'guest';
}

export const iamRoleHandlers = [
  // GET 角色列表（admin-only）
  ...pagePaths(ROLES_LIST_PATH).map((path) =>
    http.get(path, async ({ request }) => {
      await delay(200);
      if (identity(request) !== 'admin')
        return fail(1011, '没有执行此操作的权限', 403);
      const list: RoleRecord[] = roles.map((r) => ({
        ...r,
        permissionCount: permissions.get(r.id)?.length ?? 0,
      }));
      return ok(list);
    }),
  ),

  // GET 角色授权集合（admin-only）
  ...pagePaths(ROLE_PERMISSIONS_PATH(':id')).map((path) =>
    http.get(path, async ({ request, params }) => {
      await delay(200);
      if (identity(request) !== 'admin')
        return fail(1011, '没有执行此操作的权限', 403);
      const id = Number(params['id']);
      if (!roles.some((r) => r.id === id)) return fail(1013, '角色不存在', 404);
      return ok(permissions.get(id) ?? []);
    }),
  ),

  // PUT 全量替换授权（admin-only；值域校验）
  ...pagePaths(ROLE_PERMISSIONS_PATH(':id')).map((path) =>
    http.put(path, async ({ request, params }) => {
      await delay(200);
      if (identity(request) !== 'admin')
        return fail(1011, '没有执行此操作的权限', 403);
      const id = Number(params['id']);
      if (!roles.some((r) => r.id === id)) return fail(1013, '角色不存在', 404);
      const body = (await request.json().catch(() => ({}))) as {
        permissions?: string[];
      };
      const perms = body.permissions ?? [];
      if (!perms.length) return fail(1018, '请至少勾选一个授权菜单');
      const valid = new Set(allMenuCodes());
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
}
