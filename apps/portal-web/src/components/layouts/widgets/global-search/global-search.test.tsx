import { cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { GlobalSearch } from './global-search';

afterEach(cleanup);

function openViaShortcut() {
  fireEvent.keyDown(window, { key: 'k', metaKey: true });
}

describe('GlobalSearch 层级（portal 到 body）', () => {
  it('打开后搜索面板挂载在 document.body 直下，而非 header 子树内', () => {
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
