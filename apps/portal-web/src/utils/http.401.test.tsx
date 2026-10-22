import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import httpService from './http';
import { ToastRegion } from '@zanelab/ui';
import { useAuthStore, initialAuthState } from '../stores/auth-store';
import { useMenuStore, initialMenuState } from '../stores/menu-store';
import { server } from '../mocks/server';

afterEach(() => {
  cleanup();
  localStorage.clear();

  useAuthStore.setState(initialAuthState);
  useMenuStore.setState(initialMenuState);
  vi.restoreAllMocks();
});

describe('401 handler (Supabase)', () => {
  it('401 响应 → 触发 handleLogout（清 store + global-logout 事件）', async () => {
    useAuthStore.setState({ token: 'valid-token', isInitialized: true });

    const logoutSpy = vi.fn();
    window.addEventListener('global-logout', logoutSpy);

    server.use(
      http.get('/api/protected', () => new HttpResponse(null, { status: 401 })),
    );

    render(<ToastRegion />);
    await act(async () => {
      await expect(httpService.get('/api/protected')).rejects.toBeTruthy();
    });

    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().token).toBe('');

    window.removeEventListener('global-logout', logoutSpy);
  });
});
