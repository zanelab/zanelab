import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetRoleMock } from '../mocks/role-handlers';
import { resetMenuMock } from '../mocks/menu-handlers';
import { rolesApi } from './roles';

// MSW 生命周期由 setup.ts 统一管理；mock 数据每用例复位。
afterEach(() => {
  resetRoleMock();
  resetMenuMock();
});

describe('rolesApi（admin 身份）', () => {
  beforeEach(() => {
    localStorage.setItem('iam_token', 'mock-admin');
  });
  afterEach(() => {
    localStorage.removeItem('iam_token');
    localStorage.removeItem('iam_refresh_token');
  });

  it('list → 种子角色两行，含授权菜单数', async () => {
    const roles = await rolesApi.list();
    expect(roles).toHaveLength(2);
    const admin = roles.find((r) => r.code === 'admin');
    expect(admin?.permissionCount).toBe(1); // '*'
    const guest = roles.find((r) => r.code === 'guest');
    expect(guest?.permissionCount).toBe(3); // system:menu/user/role:list
  });

  it('getPermissions → 返回该角色授权权限码集合', async () => {
    const perms = await rolesApi.getPermissions(2);
    expect(perms).toEqual([
      'system:menu:list',
      'system:user:list',
      'system:role:list',
    ]);
  });

  it('savePermissions → 全量替换落库；getPermissions 反映新集合', async () => {
    await rolesApi.savePermissions(2, ['system:menu:list']);
    expect(await rolesApi.getPermissions(2)).toEqual(['system:menu:list']);
  });

  it('savePermissions 空数组 → throw（1018）', async () => {
    await expect(rolesApi.savePermissions(2, [])).rejects.toThrow(
      '请至少勾选一个授权菜单',
    );
  });

  it('savePermissions 非法 code → throw（1016）', async () => {
    await expect(rolesApi.savePermissions(2, ['not-a-menu'])).rejects.toThrow(
      '角色编码无效',
    );
  });

  it('savePermissions 不存在的角色 → throw（404）', async () => {
    await expect(rolesApi.savePermissions(999, ['home'])).rejects.toThrow(
      '角色不存在',
    );
  });
});

describe('rolesApi（游客身份，无 token）', () => {
  it('list → 403，后端 msg 透出', async () => {
    await expect(rolesApi.list()).rejects.toThrow('没有执行此操作的权限');
  });
});
