import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TimezoneButton } from './timezone-button';

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
