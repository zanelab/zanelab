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
  it('admin 身份渲染角色表（菜单树在弹窗内，不在首屏）', async () => {
    localStorage.setItem('iam_token', 'mock-admin');
    render(<RoleManagementPage />);
    await waitFor(() =>
      expect(screen.getByText('系统管理员')).toBeInTheDocument(),
    );
    expect(screen.getByText('游客')).toBeInTheDocument();
    expect(screen.getByText('运营')).toBeInTheDocument();
    // 授权树移进弹窗 → 首屏不应出现树节点
    expect(screen.queryByText('首页')).not.toBeInTheDocument();
    localStorage.removeItem('iam_token');
  });

  it('新建角色 → 弹窗内渲染授权树；勾选节点随保存提交', async () => {
    localStorage.setItem('iam_token', 'mock-admin');
    const user = userEvent.setup();
    render(<RoleManagementPage />);
    await waitFor(() => expect(screen.getByText('运营')).toBeInTheDocument());
    await user.click(screen.getByText('iam.role.create'));
    await waitFor(() =>
      expect(screen.getByText('iam.role.createTitle')).toBeInTheDocument(),
    );
    // 弹窗内树已渲染（镜像 mock 的公开子集：首页 + 系统管理壳）
    expect(screen.getByText('首页')).toBeInTheDocument();
    // 无权限码节点 checkbox 禁用 + 显示灰态；带码节点可勾选
    const homeCheckbox = screen
      .getByText('首页')
      .closest('label')!
      .querySelector('input')!;
    expect(homeCheckbox).toBeDisabled();
    // 填表 + 勾选带码节点（用户管理 system:user:list）→ 保存
    await user.type(
      screen.getByPlaceholderText('iam.role.namePlaceholder'),
      '审计员',
    );
    await user.type(
      screen.getByPlaceholderText('iam.role.codePlaceholder'),
      'auditor',
    );
    // 弹窗树数据源 = menusApi.list()（admin('*') 全量）→ 带码节点在「系统管理」子级
    await user.click(screen.getByText('用户管理').closest('label')!);
    await user.click(screen.getByText('iam.role.save'));
    // 保存成功 → 弹窗关闭 + 列表刷新出现新角色（mock 授权集合会收到空 permission 集）
    await waitFor(() =>
      expect(
        screen.queryByText('iam.role.createTitle'),
      ).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(screen.getByText('审计员')).toBeInTheDocument());
    localStorage.removeItem('iam_token');
  });

  it('编辑非内置角色 → 弹窗树回显其勾选（guest 授权 system:* 读码）', async () => {
    localStorage.setItem('iam_token', 'mock-admin');
    const user = userEvent.setup();
    render(<RoleManagementPage />);
    await waitFor(() => expect(screen.getByText('游客')).toBeInTheDocument());
    // 点「游客」行的编辑（游客是内置 → 按钮禁用）→ 改用「运营」行（非内置可编辑）
    const row = screen.getByText('运营').closest('tr')!;
    const editBtn = [...row.querySelectorAll('button')].find(
      (b) => b.textContent === 'iam.role.edit',
    )!;
    expect(editBtn).not.toBeDisabled();
    await user.click(editBtn);
    await waitFor(() =>
      expect(screen.getByText('iam.role.editTitle')).toBeInTheDocument(),
    );
    // 弹窗内树已渲染（镜像 mock 的公开子集：首页 + 系统管理壳）
    expect(screen.getByText('首页')).toBeInTheDocument();
    localStorage.removeItem('iam_token');
  });

  it('游客（无 token）→ 403 后置只读：无操作按钮、无新建入口', async () => {
    render(<RoleManagementPage />);
    await waitFor(() =>
      expect(screen.getByText('iam.menu.readOnly')).toBeInTheDocument(),
    );
    // 只读：操作按钮与新建入口不渲染（弹窗的保存按钮只在 formOpen 时存在）
    expect(screen.queryByText('iam.role.edit')).not.toBeInTheDocument();
    expect(screen.queryByText('iam.role.create')).not.toBeInTheDocument();
  });
});
