import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuManagementPage } from './MenuManagementPage';
import { resetMenuMock } from '../mocks/menu-handlers';

// i18n 最小桩：t() 返回键名（断言按键名定位；resendIn 类带参键本页未用）。
// **t 必须是模块级稳定引用**：页面的 reload useCallback 依赖 [t]，t 每渲染
// 新引用会让 useEffect 无限重跑（重拉循环），expanded 状态被冲掉。
const tStable = (k: string) => k;
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: tStable }),
}));

// MSW 生命周期由 src/test/setup.ts 统一管理
afterEach(() => resetMenuMock());

describe('MenuManagementPage', () => {
  it('渲染种子菜单树（首页 + 系统管理及其子级，缩进行可见）', async () => {
    render(<MenuManagementPage />);
    await waitFor(() => expect(screen.getByText('首页')).toBeInTheDocument());
    expect(screen.getByText('系统管理')).toBeInTheDocument();
    // 子级默认收起——展开后才出现
    expect(screen.queryByText('菜单管理')).not.toBeInTheDocument();
  });

  it('展开父节点显示子级；再点收起', async () => {
    const user = userEvent.setup();
    render(<MenuManagementPage />);
    await waitFor(() =>
      expect(screen.getByText('系统管理')).toBeInTheDocument(),
    );
    // 种子数据中只有"系统管理"有子级（首页 children 为 null）→ 恰 1 个展开钮
    const expandButtons = screen.getAllByRole('button', {
      name: 'iam.menu.expand',
    });
    expect(expandButtons.length).toBe(1);
    await user.click(expandButtons[0]);
    expect(screen.getByText('菜单管理')).toBeInTheDocument();
    // 收起
    await user.click(screen.getByRole('button', { name: 'iam.menu.collapse' }));
    expect(screen.queryByText('菜单管理')).not.toBeInTheDocument();
  });

  it('新增菜单：填表提交后列表刷新出现新节点', async () => {
    // 页面的写链路经本地 http 客户端注入 Bearer（localStorage.iam_token），
    // 不设 = 游客 → 403 → 页面后置只读。本用例验证 admin 写路径。
    localStorage.setItem('iam_token', 'mock-admin');
    const user = userEvent.setup();
    render(<MenuManagementPage />);
    await waitFor(() =>
      expect(screen.getAllByText('首页')[0]).toBeInTheDocument(),
    );

    // 工具栏的新增按钮（getAll 防多元素；create 文案只出现在工具栏）
    await user.click(
      screen.getAllByRole('button', { name: 'iam.menu.create' })[0],
    );
    // 弹窗（受控 modal-open 无 open 属性，jsdom 无 dialog role）→ 用表单标题定位容器。
    // 默认类型 app：字段顺序 = 名称、编码、组件名称、前端路由（父级下拉与图标仅
    // 在 group/menu 类型出现，app 不渲染；placeholder 定位比位置序更抗重排）
    const dialogTitle = await screen.findByText('iam.menu.createTitle');
    const dialog = dialogTitle.closest('.modal-box')!;
    const byPlaceholder = (key: string) =>
      dialog.querySelector(`input[placeholder="${key}"]`) as HTMLInputElement;
    await user.type(byPlaceholder('iam.menu.namePlaceholder'), '角色管理');
    const codeInput = [
      ...dialog.querySelectorAll('input.font-mono'),
    ][0] as HTMLInputElement;
    await user.type(codeInput, 'roles');
    await user.type(byPlaceholder('iam.menu.uriPlaceholder'), '/roles');
    // jSDOM 下该按钮的 accessible name 计算不稳定（daisyUI btn + 条件 spinner），
    // 用弹窗容器内文本定位（语义等价：弹窗内唯一的保存动作）
    await user.click(
      [...dialog.querySelectorAll('button')].find(
        (b) => b.textContent === 'iam.menu.save',
      )!,
    );

    // 重拉后新节点在树中（根级新节点直接可见）
    await waitFor(() =>
      expect(
        screen.queryByText('iam.menu.createTitle'),
      ).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.getByText('角色管理')).toBeInTheDocument(),
    );
    localStorage.removeItem('iam_token');
  });

  it('删除确认弹窗展示级联数量；确认后列表刷新', async () => {
    localStorage.setItem('iam_token', 'mock-admin');
    const user = userEvent.setup();
    render(<MenuManagementPage />);
    await waitFor(() =>
      expect(screen.getAllByText('系统管理')[0]).toBeInTheDocument(),
    );

    // 展开全部有子级的节点（新增用例不影响本用例——组件独立 render），
    // 再从"菜单管理"行触发删除（行内最后一个按钮）
    for (const btn of screen.getAllByRole('button', {
      name: 'iam.menu.expand',
    })) {
      await user.click(btn);
    }
    // 表格行内的"菜单管理"（页面 <h1> 标题同名 → 限定 td 内文本）
    const cell = screen
      .getAllByText('菜单管理')
      .map((el) => el.closest('td'))
      .find((td) => td !== null)!;
    const row = cell.closest('tr')!;
    const rowButtons = row.querySelectorAll('button');
    await user.click(rowButtons[rowButtons.length - 1] as HTMLElement);

    // 确认弹窗（受控 modal 无 dialog role）→ 删除确认标题定位
    await waitFor(() =>
      expect(screen.getByText('iam.menu.deleteTitle')).toBeInTheDocument(),
    );
    // 级联数量文案（该节点是叶子 → n=0）
    expect(screen.getByText(/iam.menu.deleteConfirm/)).toBeInTheDocument();
    // 同名冲突（行内删除按钮与确认按钮都叫 iam.menu.delete）→ 弹窗容器内定位
    const confirmBox = screen
      .getByText('iam.menu.deleteTitle')
      .closest('.modal-box')!;
    await user.click(
      [...confirmBox.querySelectorAll('button')].find(
        (b) => b.textContent === 'iam.menu.delete',
      )!,
    );

    await waitFor(() =>
      expect(
        screen.queryByText('iam.menu.deleteTitle'),
      ).not.toBeInTheDocument(),
    );
    // 重拉后子级已删（删除成功 → 树无子级 → 无 expand 按钮，无需再展开）；
    // 页面 <h1> 标题同为"菜单管理" → 限定表格 td 内的行文本
    const remainingCells = screen
      .queryAllByText('菜单管理')
      .filter((el) => el.closest('td'));
    expect(remainingCells).toHaveLength(0);
    localStorage.removeItem('iam_token');
  });
});
