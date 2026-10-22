import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LockScreenModal } from './lock-screen-modal';

afterEach(cleanup);

describe('LockScreenModal 层级（portal 到 body）', () => {
  it('打开时 modal 挂载在 document.body 直下，而非宿主子树内', () => {
    const host = document.createElement('div');
    host.dataset.headerSubtree = 'true';
    document.body.appendChild(host);
    try {
      render(<LockScreenModal open text="Admin" />, { container: host });
      const modal = document.querySelector('.modal');
      expect(modal).not.toBeNull();
      expect(modal!.parentElement).toBe(document.body);
      expect(host.contains(modal)).toBe(false);
    } finally {
      document.body.removeChild(host);
    }
  });

  it('关闭时不渲染任何 modal 节点', () => {
    const { container } = render(<LockScreenModal open={false} />);
    expect(container.querySelector('.modal')).toBeNull();
  });

  it('点击空白区域（backdrop）→ onOpenChange(false)；点击弹窗内容不关闭', () => {
    const onOpenChange = vi.fn();
    render(<LockScreenModal open onOpenChange={onOpenChange} />);
    const modal = document.querySelector('.modal')!;
    const box = modal.querySelector('.modal-box')!;

    fireEvent.click(box);
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.click(modal);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('密码输入框与解锁按钮间距 24px（mt-6，jsdom 无布局以 class 为代理断言）', () => {
    render(<LockScreenModal open />);
    const button = document.querySelector('.modal-box button.btn-primary')!;
    expect(button.className).toContain('mt-6');
  });
});
