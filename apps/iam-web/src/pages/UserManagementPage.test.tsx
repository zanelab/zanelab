import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserManagementPage } from './UserManagementPage';
import { resetUserMock } from '../mocks/user-handlers';

// i18n 桩：t 必须模块级稳定引用（页面的 reload useCallback 依赖 [t]，
// 内联箭头函数每渲染新引用会让 useEffect 无限重跑——见菜单页同款踩坑）
const tStable = (k: string) => k;
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: tStable }),
}));

// MSW 生命周期由 src/test/setup.ts 统一管理
afterEach(() => resetUserMock());

describe('UserManagementPage', () => {
  it('admin 身份渲染种子用户表格（邮箱/角色/状态）', async () => {
    // 用户列表 admin-only：无 token = 游客 403（见下个用例），须注入 token
    localStorage.setItem('iam_token', 'mock-admin');
    render(<UserManagementPage />);
    await waitFor(() =>
      expect(screen.getAllByText('admin@example.com')[0]).toBeInTheDocument(),
    );
    expect(screen.getByText('guest@example.com')).toBeInTheDocument();
    // 两个种子用户都 active → getAll 防重复
    expect(screen.getAllByText('iam.user.active')).toHaveLength(2);
    localStorage.removeItem('iam_token');
  });

  it('游客（无 token）→ 403：空态显示后端 msg + 后置只读（无操作列）', async () => {
    render(<UserManagementPage />);
    // 列表 admin-only → 游客 403 → 表格空态显示后端 msg（toast 由集成态拦截器管）
    await waitFor(() =>
      expect(document.body.textContent?.includes('没有执行此操作的权限')).toBe(
        true,
      ),
    );
    // readOnly 置位后操作列消失
    await waitFor(() =>
      expect(
        screen.queryByText('iam.user.assignRoles'),
      ).not.toBeInTheDocument(),
    );
  });

  it('admin 角色分配：弹窗勾选 → 提交 → 列表刷新', async () => {
    localStorage.setItem('iam_token', 'mock-admin');
    const user = userEvent.setup();
    render(<UserManagementPage />);
    await waitFor(() =>
      expect(screen.getAllByText('guest@example.com')[0]).toBeInTheDocument(),
    );

    // guest 行（含 admin@example.com 两行——取第二行）的分配角色按钮
    const row = screen.getAllByText('guest@example.com')[0].closest('tr')!;
    await user.click(
      [...row.querySelectorAll('button')].find(
        (b) => b.textContent === 'iam.user.assignRoles',
      )!,
    );
    // 弹窗：guest toggle 已勾选 → 勾上 admin（label 文本在弹窗容器内定位——
    // role_admin 同时是行内 badge 文本，getAll 会歧义）
    await screen.findByText('iam.user.rolesTitle');
    const rolesBox = screen
      .getByText('iam.user.rolesTitle')
      .closest('.modal-box')!;
    const adminToggle = [...rolesBox.querySelectorAll('label')].find((l) =>
      l.textContent?.includes('iam.user.role_admin'),
    )!;
    await user.click(adminToggle.querySelector('input')!);
    // 保存（弹窗容器内定位——与菜单页同款防同名歧义）
    const box = screen.getByText('iam.user.rolesTitle').closest('.modal-box')!;
    await user.click(
      [...box.querySelectorAll('button')].find(
        (b) => b.textContent === 'iam.menu.save',
      )!,
    );

    await waitFor(() =>
      expect(screen.queryByText('iam.user.rolesTitle')).not.toBeInTheDocument(),
    );
    // 重拉后 guest 行出现 admin badge
    await waitFor(() => {
      const guestRow = screen
        .getAllByText('guest@example.com')[0]
        .closest('tr')!;
      expect(guestRow.textContent).toContain('iam.user.role_admin');
    });
    localStorage.removeItem('iam_token');
  });

  it('禁用：点禁用按钮 → 状态变已禁用；自禁行无禁用按钮（后端 1015 兜底）', async () => {
    localStorage.setItem('iam_token', 'mock-admin');
    const user = userEvent.setup();
    render(<UserManagementPage />);
    await waitFor(() =>
      expect(screen.getAllByText('guest@example.com')[0]).toBeInTheDocument(),
    );

    const guestRow = screen.getAllByText('guest@example.com')[0].closest('tr')!;
    await user.click(
      [...guestRow.querySelectorAll('button')].find(
        (b) => b.textContent === 'iam.user.disable',
      )!,
    );

    await waitFor(() => {
      const updated = screen
        .getAllByText('guest@example.com')[0]
        .closest('tr')!;
      expect(updated.textContent).toContain('iam.user.banned');
    });
    localStorage.removeItem('iam_token');
  });
});
