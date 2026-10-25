/**
 * 密码加密：当前后端走 base64（btoa）。调用方需与 iam 登录页
 * （apps/iam-web LoginPage）保持同一加密口径。
 *
 * @param password 明文密码
 * @returns base64 编码后的密码字符串
 */
export function encryptPassword(password: string): string {
  return btoa(password.trim());
}
