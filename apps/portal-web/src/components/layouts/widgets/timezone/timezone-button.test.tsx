import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TimezoneButton } from './timezone-button';

// 层级 bug 根因：TimezoneButton 渲染在 header（fixed + z-index 200，低于侧边栏 201）
// 内部，dialog 的 z-999 被困在 header 的 stacking context 里，盖不住侧边栏。
// 修复契约：全屏 overlay 一律 portal 到 document.body（同 preferences-drawer 先例）。
// jsdom 不计算绘制层级，以「overlay 挂载在 body 直下」为可测断言。

afterEach(cleanup);

describe('TimezoneButton 层级（portal 到 body）', () => {
  it('打开后 dialog 挂载在 document.body 直下，而非 header 子树内', async () => {
    const host = document.createElement('div');
    host.dataset.headerSubtree = 'true';
    document.body.appendChild(host);
    try {
      render(<TimezoneButton />, { container: host });
      fireEvent.click(host.querySelector('button')!);
      const dialog = document.querySelector('dialog.modal');
      expect(dialog).not.toBeNull();
      expect(dialog!.parentElement).toBe(document.body);
      expect(host.contains(dialog)).toBe(false);
    } finally {
      document.body.removeChild(host);
    }
  });
});
