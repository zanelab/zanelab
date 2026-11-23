/*
 * mock 身份 → 权限码集合（iam-web src/mocks/auth.ts 平移；镜像 skills Edge Fn
 * 的 userPermissions/requirePermission）。
 *
 * 三级身份：
 * - Bearer mock-admin → ['*']（admin，全量）
 * - Bearer mock-skills-editor → ['skills:skill:create','skills:skill:update','skills:skill:delete']
 *   （skills 域编辑者——验证「有写码非 admin」的放行路径）
 * - 无 Authorization → []（匿名：读 200 / 写 403）
 *
 * 判定只认权限码，不认角色（与 Edge Fn 铁律一致）——handlers 用 can(perms, code)
 * 放行/403，而非身份二值。
 */

/** skills 域编辑者（非 admin 的写码持有者，验证 403/放行分界）。 */
export const SKILLS_EDITOR_PERMISSIONS = [
  'skills:skill:create',
  'skills:skill:update',
  'skills:skill:delete',
] as const;

/** 请求头 → 调用方权限码集合（'*' 通配 admin；[] 匿名）。 */
export function resolvePermissions(request: Request): string[] {
  const auth = request.headers.get('authorization') ?? '';
  if (auth === 'Bearer mock-admin') return ['*'];
  if (auth === 'Bearer mock-skills-editor') {
    return [...SKILLS_EDITOR_PERMISSIONS];
  }
  return [];
}

/** 权限码命中判定（'*' 通配通过）。 */
export function can(perms: string[], code: string): boolean {
  return perms.includes('*') || perms.includes(code);
}
