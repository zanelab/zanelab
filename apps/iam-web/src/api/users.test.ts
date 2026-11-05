import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetUserMock } from '../mocks/user-handlers';
import { usersApi } from './users';

// MSW 生命周期由 src/test/setup.ts 统一管理；mock 数据每用例复位。
afterEach(() => resetUserMock());

describe('usersApi（admin 身份，localStorage 注入 token）', () => {
  beforeEach(() => {
    localStorage.setItem('iam_token', 'mock-admin');
  });
  afterEach(() => {
    localStorage.removeItem('iam_token');
    localStorage.removeItem('iam_refresh_token');
  });

  it('list → 种子用户两行，含 email/角色/状态', async () => {
    const users = await usersApi.list();
    expect(users).toHaveLength(2);
    const admin = users.find((u) => u.email === 'admin@example.com');
    expect(admin?.roles).toEqual(['admin']);
    expect(admin?.banned_until).toBeNull();
  });

  it('assignRoles → 全量替换落库；list 反映新角色', async () => {
    const users = await usersApi.list();
    const guest = users.find((u) => u.email === 'guest@example.com')!;
    await usersApi.assignRoles(guest.id, ['admin']);
    const after = (await usersApi.list()).find((u) => u.id === guest.id)!;
    expect(after.roles).toEqual(['admin']);
  });

  it('assignRoles 空数组/无效码 → throw Error(角色编码无效)', async () => {
    const users = await usersApi.list();
    const guest = users.find((u) => u.email === 'guest@example.com')!;
    await expect(usersApi.assignRoles(guest.id, [])).rejects.toThrow(
      '角色编码无效',
    );
    await expect(
      usersApi.assignRoles(guest.id, ['nonexistent']),
    ).rejects.toThrow('角色编码无效');
  });

  it('setBanned(true) → banned_until 置位；setBanned(false) → 恢复', async () => {
    const users = await usersApi.list();
    const guest = users.find((u) => u.email === 'guest@example.com')!;
    await usersApi.setBanned(guest.id, true);
    const banned = (await usersApi.list()).find((u) => u.id === guest.id)!;
    expect(banned.banned_until).toBeTruthy();
    await usersApi.setBanned(guest.id, false);
    const restored = (await usersApi.list()).find((u) => u.id === guest.id)!;
    expect(restored.banned_until).toBeNull();
  });

  it('setBanned 自己（admin 种子用户）→ throw Error(不能禁用当前登录的账号)', async () => {
    const users = await usersApi.list();
    const admin = users.find((u) => u.email === 'admin@example.com')!;
    await expect(usersApi.setBanned(admin.id, true)).rejects.toThrow(
      '不能禁用当前登录的账号',
    );
  });

  it('assignRoles 不存在的用户 → throw（404 msg 透出）', async () => {
    await expect(usersApi.assignRoles('no-such-id', ['guest'])).rejects.toThrow(
      '用户不存在',
    );
  });
});

describe('usersApi（游客身份，无 token）', () => {
  it('list → 403，后端 msg 透出', async () => {
    await expect(usersApi.list()).rejects.toThrow('没有执行此操作的权限');
  });
});
