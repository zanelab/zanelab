import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Permission } from './Permission';
import { useMenuStore, initialMenuState } from '../stores/menu-store';
import { mockMenus } from '../mocks/handlers';

afterEach(() => {
  cleanup();

  useMenuStore.setState(initialMenuState);
});

describe('Permission（§7.4）', () => {
  it('有权限码 → 原样渲染 children', () => {
    useMenuStore.getState().setMenus(mockMenus);
    render(
      <Permission code="demo:button:view">
        <button type="button">删除</button>
      </Permission>,
    );
    expect(screen.getByRole('button', { name: '删除' })).toBeEnabled();
  });

  it('hide（默认）：无权限 → 不渲染', () => {
    useMenuStore.getState().setMenus(mockMenus);
    render(
      <Permission code="demo:button:delete">
        <button type="button">删除</button>
      </Permission>,
    );
    expect(screen.queryByRole('button', { name: '删除' })).toBeNull();
  });

  it('disabled：无权限 → 渲染但带 disabled/aria-disabled 与 daisyUI 禁用类', () => {
    useMenuStore.getState().setMenus(mockMenus);
    render(
      <Permission code="demo:button:delete" mode="disabled">
        <button type="button" className="btn btn-error">
          删除
        </button>
      </Permission>,
    );
    const btn = screen.getByRole('button', { name: '删除' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn.className).toContain('disabled');

    expect(btn.className).toContain('btn');
  });

  it('空权限集 + 任意码 → hide 不渲染（权限集为空时不放行）', () => {
    render(
      <Permission code="demo:button:view">
        <button type="button">删除</button>
      </Permission>,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });
});
