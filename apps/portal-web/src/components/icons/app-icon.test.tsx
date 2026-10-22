import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AppIcon, renderMenuIcon } from './app-icon';
import { BUILTIN_ICONS } from './builtin-icons';
import { useIconStore } from '../../stores/icon-store';
import type { IconData } from '@zanelab/types';

afterEach(() => {
  cleanup();
  useIconStore.setState({ icons: {} });
});

function renderedPaths(container: HTMLElement): string[] {
  return [...container.querySelectorAll('path')].map(
    (p) => p.getAttribute('d') ?? '',
  );
}

describe('AppIcon 解析顺序', () => {
  it('未注册标识符命中内置表', () => {
    const { container } = render(<AppIcon name="user" />);
    expect(renderedPaths(container)).toEqual(BUILTIN_ICONS.user.paths);
  });

  it('运行时注册表覆盖内置表（同键优先）', () => {
    const override: IconData = { paths: ['M9 9'] };
    useIconStore.getState().registerIcons({ user: override });
    const { container } = render(<AppIcon name="user" />);
    expect(renderedPaths(container)).toEqual(override.paths);
  });

  it('svg: 前缀直通：标识符即 path data，多段用 | 分隔', () => {
    const { container } = render(<AppIcon name="svg:M3 3h4|M5 5v4" />);
    expect(renderedPaths(container)).toEqual(['M3 3h4', 'M5 5v4']);
  });

  it('未命中（非 svg: 且无注册）→ 不渲染任何元素', () => {
    const { container } = render(<AppIcon name="nope-unknown" />);
    expect(container.querySelector('svg')).toBeNull();
    expect(container.textContent).toBe('');
  });

  it('自定义 viewBox 生效，缺省回退 0 0 24 24', () => {
    useIconStore.getState().registerIcons({
      wide: { viewBox: '0 0 48 48', paths: ['M1 1'] },
    });
    const { container } = render(<AppIcon name="wide" />);
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe(
      '0 0 48 48',
    );
    cleanup();
    const { container: c2 } = render(<AppIcon name="svg:M1 1" />);
    expect(c2.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 24 24');
  });
});

describe('renderMenuIcon', () => {
  it('字符串标识符 → AppIcon（可解析）', () => {
    const node = renderMenuIcon('user');
    const { container } = render(<>{node}</>);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('ReactNode 原样透传', () => {
    const node = <span data-testid="raw">x</span>;
    expect(renderMenuIcon(node)).toBe(node);
  });
});
