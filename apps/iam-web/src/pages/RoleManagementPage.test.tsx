import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoleManagementPage } from './RoleManagementPage';
import { resetRoleMock } from '../mocks/role-handlers';
import { resetMenuMock } from '../mocks/menu-handlers';

const tStable = (k: string) => k;
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: tStable }) }));

afterEach(() => {
  resetRoleMock();
  resetMenuMock();
});

describe('RoleManagementPage', () => {
  it('admin 身份渲染角色表 + 菜单树', async () => {
    localStorage.setItem('iam_token', 'mock-admin');
    render(<RoleManagementPage />);
    await waitFor(() =>
      expect(screen.getByText('系统管理员')).toBeInTheDocument(),
    );
    expect(screen.getByText('游客')).toBeInTheDocument();
    // 菜单树渲染（首页/系统管理）
    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('系统管理')).toBeInTheDocument();
    localStorage.removeItem('iam_token');
  });

  it('选中角色 → 树回显其授权（guest 授权 system:* 读码）', async () => {
    localStorage.setItem('iam_token', 'mock-admin');
    const user = userEvent.setup();
    render(<RoleManagementPage />);
    await waitFor(() => expect(screen.getByText('游客')).toBeInTheDocument());
    await user.click(screen.getByText('游客'));
    // 树回显：guest 授权 system:user:list/system:menu:list → 用户管理/菜单管理勾选；
    // 首页/系统管理 permission 为空（公开节点）→ 不勾选
    await waitFor(() => {
      const usersCheckbox = screen
        .getByText('用户管理')
        .closest('label')!
        .querySelector('input')!;
      expect(usersCheckbox.checked).toBe(true);
    });
    expect(
      screen.getByText('首页').closest('label')!.querySelector('input')!
        .checked,
    ).toBe(false);
    localStorage.removeItem('iam_token');
  });

  it('游客（无 token）→ 403 后置只读：保存/还原禁用', async () => {
    render(<RoleManagementPage />);
    await waitFor(() =>
      expect(screen.getByText('iam.menu.readOnly')).toBeInTheDocument(),
    );
    expect(screen.getByText('iam.role.save')).toBeDisabled();
    expect(screen.getByText('iam.role.revert')).toBeDisabled();
  });
});
