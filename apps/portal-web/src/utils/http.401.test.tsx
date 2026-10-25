import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import httpService from '../utils/http';
import { ToastRegion } from '@zanelab/ui';
import { useAuthStore, initialAuthState } from '../stores/auth-store';
import { useMenuStore, initialMenuState } from '../stores/menu-store';
import { server } from '../mocks/server';
import { TOKEN_HEADER } from '../constants/auth';

afterEach(() => {
  cleanup();
  localStorage.clear();

  useAuthStore.setState(initialAuthState);
  useMenuStore.setState(initialMenuState);
  vi.restoreAllMocks();
});

describe('401 单飞刷新', () => {
  it('并发两个 401 请求：refresh 只调一次，两个请求都以新 token 重放成功', async () => {
    localStorage.setItem('portal_refresh_token', 'mock-refresh-token');
    useAuthStore.getState().setToken('expired-token');

    let refreshCalls = 0;
    server.use(
      http.post('/sys/auth/refresh', () => {
        refreshCalls++;
        return HttpResponse.json({
          code: 0,
          data: { token: 'mock-access-token-2' },
          msg: 'ok',
        });
      }),
      http.get('/api/protected', ({ request }) => {
        const token = request.headers.get(TOKEN_HEADER);
        if (token === 'expired-token') {
          return new HttpResponse(null, { status: 401 });
        }
        return HttpResponse.json({ code: 0, data: { ok: true }, msg: 'ok' });
      }),
    );

    const [r1, r2] = await Promise.all([
      httpService.get('/api/protected'),
      httpService.get('/api/protected'),
    ]);

    expect(refreshCalls).toBe(1);
    expect(r1).toEqual({ ok: true });
    expect(r2).toEqual({ ok: true });

    expect(useAuthStore.getState().token).toBe('mock-access-token-2');
  });

  it('刷新失败 → handleLogout（清态 + global-logout 事件）', async () => {
    localStorage.setItem('portal_refresh_token', 'bad-token');
    localStorage.setItem('portal_token', 'expired-token');
    useAuthStore.getState().setToken('expired-token');

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
    expect(localStorage.getItem('portal_token')).toBeNull();
    expect(useAuthStore.getState().token).toBe('');
    window.removeEventListener('global-logout', logoutSpy);
  });
});
