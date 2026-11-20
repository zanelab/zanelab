import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Permission } from './permission';
import { setProps } from '../props';

// 与 iam-web 的 Permission 同构判定矩阵（纯 getProps 快照，无订阅）。
// 模块级 props 存储：每个用例后回到「无宿主」，避免用例间互相污染。
afterEach(() => setProps({}));

function renderPermission(code = 'skills:skill:create') {
  return render(
    <Permission code={code}>
      <button type="button">上传 skills</button>
    </Permission>,
  );
}

describe('Permission', () => {
  it('独立态（未注入 permissions）→ 渲染（写操作靠后端 403 兜底）', () => {
    renderPermission();
    expect(
      screen.getByRole('button', { name: '上传 skills' }),
    ).toBeInTheDocument();
  });

  it('空数组**不是**独立态：有宿主但无权限 → hide 模式不渲染', () => {
    setProps({ permissions: [] });
    renderPermission();
    expect(
      screen.queryByRole('button', { name: '上传 skills' }),
    ).not.toBeInTheDocument();
  });

  it('命中权限码 → 渲染', () => {
    setProps({ permissions: ['skills:skill:list', 'skills:skill:create'] });
    renderPermission();
    expect(
      screen.getByRole('button', { name: '上传 skills' }),
    ).toBeInTheDocument();
  });

  it('不含该码 → hide 模式返回 null', () => {
    setProps({ permissions: ['skills:skill:list'] });
    renderPermission();
    expect(
      screen.queryByRole('button', { name: '上传 skills' }),
    ).not.toBeInTheDocument();
  });

  it('含通配 * → 渲染', () => {
    setProps({ permissions: ['*'] });
    renderPermission();
    expect(
      screen.getByRole('button', { name: '上传 skills' }),
    ).toBeInTheDocument();
  });

  describe('mode="disabled"', () => {
    it('不含该码 → span 包裹（aria-disabled + 禁用样式类），子元素仍在 DOM', () => {
      setProps({ permissions: ['skills:skill:list'] });
      render(
        <Permission code="skills:skill:create" mode="disabled">
          <button type="button">上传 skills</button>
        </Permission>,
      );
      const button = screen.getByRole('button', { name: '上传 skills' });
      const wrapper = button.parentElement as HTMLElement;
      expect(wrapper.tagName).toBe('SPAN');
      expect(wrapper).toHaveAttribute('aria-disabled', 'true');
      expect(wrapper).toHaveClass('pointer-events-none', 'opacity-40');
    });

    it('命中权限码 → 不包裹，直接渲染子元素', () => {
      setProps({ permissions: ['skills:skill:create'] });
      render(
        <Permission code="skills:skill:create" mode="disabled">
          <button type="button">上传 skills</button>
        </Permission>,
      );
      const button = screen.getByRole('button', { name: '上传 skills' });
      expect(button.parentElement!.tagName).not.toBe('SPAN');
    });
  });
});
