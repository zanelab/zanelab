import { cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { GlobalSearch } from './global-search';

// 层级 bug 根因：全屏 overlay 渲染在 header（fixed + z-index 200，低于侧边栏 201）
// 内部时，自身 z-index 被困在 header 的 stacking context 里，永远盖不住侧边栏。
// 修复契约：全屏 overlay 一律 portal 到 document.body（同 preferences-drawer 先例）。
// jsdom 不计算绘制层级，以「overlay 挂载在 body 直下」为可测断言。

afterEach(cleanup);

function openViaShortcut() {
  fireEvent.keyDown(window, { key: 'k', metaKey: true });
}

describe('GlobalSearch 层级（portal 到 body）', () => {
  it('打开后搜索面板挂载在 document.body 直下，而非 header 子树内', () => {
    // 模拟真实挂载：header 内的容器（非 body 直下）
    const host = document.createElement('div');
    host.dataset.headerSubtree = 'true';
    document.body.appendChild(host);
    try {
      render(
        <MemoryRouter>
          <GlobalSearch />
        </MemoryRouter>,
        { container: host },
      );
      openViaShortcut();
      const input = document.querySelector('input[placeholder]');
      expect(input).not.toBeNull();
      const overlay = input!.closest('.fixed.inset-0');
      expect(overlay).not.toBeNull();
      expect(overlay!.parentElement).toBe(document.body);
      expect(host.contains(overlay)).toBe(false);

      // 根层 z-index 必须高于侧边栏（preferences.app.zIndex 200 + 1 = 201）：
      // portal 只解决挂载位置，z-50 仍会被侧边栏盖住（对齐 daisyUI modal 的 999）
      expect(overlay!.className).toContain('z-999');
    } finally {
      document.body.removeChild(host);
    }
  });

  it('关闭后 body 下的 portal 节点清理', () => {
    render(
      <MemoryRouter>
        <GlobalSearch />
      </MemoryRouter>,
    );
    openViaShortcut();
    openViaShortcut();
    expect(document.querySelector('input[placeholder]')).toBeNull();
  });
});
