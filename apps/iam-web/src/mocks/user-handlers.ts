import { delay, http, HttpResponse } from 'msw';
import {
  USERS_LIST_PATH,
  USER_ROLES_PATH,
  USER_BAN_PATH,
  INTEGRATION_PREFIX,
} from '../api/endpoints';
import type { UserRecord } from '../api/users';

/*
 * iam 子应用用户 mock handler（用户自身接口的 mock 契约，与菜单 mock 同模式）。
 *
 * 契约 = Edge Fn 用户端点：
 * - GET  /auth/users          → 用户列表（admin-only）
 * - PUT  /users/:id/roles     → 角色分配（admin-only；全量替换）
 * - PUT  /users/:id/ban       → 禁用/恢复（admin-only；自禁 1015）
 *
 * 身份判定与 otp/menu handlers 同款：Bearer mock-admin = admin，其余 = 游客。
 */

const seedUsers: UserRecord[] = [
  {
    id: 'u-admin-1',
    email: 'admin@example.com',
    created_at: '2026-11-01T08:00:00Z',
    last_sign_in_at: '2026-11-05T02:00:00Z',
    banned_until: null,
    roles: ['admin'],
  },
  {
    id: 'u-guest-1',
    email: 'guest@example.com',
    created_at: '2026-11-02T09:00:00Z',
    last_sign_in_at: '2026-11-04T18:00:00Z',
    banned_until: null,
    roles: ['guest'],
  },
];

let users: UserRecord[] = structuredClone(seedUsers);

const ok = (data: unknown) => HttpResponse.json({ code: 0, data, msg: 'ok' });
const fail = (code: number, msg: string, status = 400) =>
  HttpResponse.json({ code, data: null, msg }, { status });

const pagePaths = (p: string) => [p, `${INTEGRATION_PREFIX}${p}`];

function identity(request: Request): 'admin' | 'guest' {
  const auth = request.headers.get('authorization') ?? '';
  return auth === 'Bearer mock-admin' ? 'admin' : 'guest';
}

const VALID_ROLES = ['admin', 'guest'];

export const iamUserHandlers = [
  // GET 列表（admin-only；游客 403）
  ...pagePaths(USERS_LIST_PATH).map((path) =>
    http.get(path, async ({ request }) => {
      await delay(200);
      if (identity(request) !== 'admin')
        return fail(1011, '没有执行此操作的权限', 403);
      return ok(users);
    }),
  ),

  // PUT 角色分配（全量替换；自改放行——角色分配无自保护语义）
  ...pagePaths(USER_ROLES_PATH(':id')).map((path) =>
    http.put(path, async ({ request, params }) => {
      await delay(200);
      if (identity(request) !== 'admin')
        return fail(1011, '没有执行此操作的权限', 403);
      const id = String(params['id']);
      const row = users.find((u) => u.id === id);
      if (!row) return fail(1013, '用户不存在', 404);
      const body = (await request.json().catch(() => ({}))) as {
        roles?: string[];
      };
      const roles = body.roles ?? [];
      if (!roles.length || roles.some((r) => !VALID_ROLES.includes(r)))
        return fail(1016, '角色编码无效');
      row.roles = roles;
      return ok({ id, roles });
    }),
  ),

  // PUT 禁用/恢复（自禁 1015；被禁用户标记 banned_until）
  ...pagePaths(USER_BAN_PATH(':id')).map((path) =>
    http.put(path, async ({ request, params }) => {
      await delay(200);
      if (identity(request) !== 'admin')
        return fail(1011, '没有执行此操作的权限', 403);
      const id = String(params['id']);
      const row = users.find((u) => u.id === id);
      if (!row) return fail(1013, '用户不存在', 404);
      const body = (await request.json().catch(() => ({}))) as {
        disabled?: boolean;
      };
      if (body.disabled === undefined) return fail(1001, '请求格式错误');
      // 自禁保护：mock 的「自己」= Bearer mock-admin 对应的种子 admin 用户
      if (id === 'u-admin-1' && body.disabled)
        return fail(1015, '不能禁用当前登录的账号');
      row.banned_until = body.disabled ? '2999-01-01T00:00:00Z' : null;
      return ok({ id, disabled: !!body.disabled });
    }),
  ),
];

export function resetUserMock(): void {
  users = structuredClone(seedUsers);
}
