/*
 * mock 身份 → 权限码集合（任务 11-06 RBAC，镜像 Edge Fn 的 userPermissions/requirePermission）。
 *
 * 三级身份（README「mock 路线」节）：
 * - Bearer mock-admin → ['*']（admin，全量）
 * - Bearer mock-guest → 游客读码（system:menu/user/role:list）
 * - 无 Authorization → []（匿名，仅游客可见菜单）
 *
 * 判定只认权限码，不认角色（与 Edge Fn 铁律一致）——handlers 用 can(perms, code)
 * 放行/403，而非旧的身份 === 'admin' 二值。
 */

/** 游客角色种子授权（与 role-handlers 的 seedPermissions[2] 同源）。 */
export const GUEST_PERMISSIONS = [
  'system:menu:list',
  'system:user:list',
  'system:role:list',
] as const;

/** 请求头 → 调用方权限码集合（'*' 通配 admin；[] 匿名）。 */
export function resolvePermissions(request: Request): string[] {
  const auth = request.headers.get('authorization') ?? '';
  if (auth === 'Bearer mock-admin') return ['*'];
  if (auth === 'Bearer mock-guest') return [...GUEST_PERMISSIONS];
  return [];
}

/** 权限码命中判定（'*' 通配通过）。 */
export function can(perms: string[], code: string): boolean {
  return perms.includes('*') || perms.includes(code);
}
