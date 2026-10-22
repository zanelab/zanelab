import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { authApi } from '../api/auth';
import { fetchMenus } from '../api/menu';
import { ToastRegion } from '@zanelab/ui';
import { notify } from '@zanelab/utils';
import { mockMenus } from '../mocks/handlers';
import { server } from '../mocks/server';

vi.mock('../api/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/auth')>();
  return {
    ...actual,
    supabaseLogin: vi.fn(),
  };
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn(),
      getUser: vi.fn(),
    },
  },
}));

afterEach(cleanup);

describe('ToastRegion', () => {
  it('notify.error 后出现含 alert alert-error 的 toast', async () => {
    render(<ToastRegion />);
    act(() => notify.error('出错了'));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('出错了');
    expect(alert.className).toContain('alert-error');
  });
});

describe('http 拦截器 × MSW', () => {
  it('登录错误 → supabaseLogin reject → notify + reject', async () => {
    const { supabaseLogin } = await import('../api/auth');
    vi.mocked(supabaseLogin).mockRejectedValueOnce(
      new Error('用户名或密码错误'),
    );

    render(<ToastRegion />);
    await act(async () => {
      await expect(
        authApi.login({ username: 'admin', password: 'wrong' }),
      ).rejects.toThrow('用户名或密码错误');
    });
  });

  it('HTTP 500（menus 端点）→ notify 服务器错误', async () => {
    server.use(
      http.get('/api/user/menus', () =>
        HttpResponse.json(null, { status: 500 }),
      ),
    );
    render(<ToastRegion />);
    await act(async () => {
      await expect(fetchMenus()).rejects.toBeTruthy();
    });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('服务器错误，请稍后重试');
  });
});

describe('authApi.login (Supabase-backed)', () => {
  it('authApi.login 调用 supabaseLogin → 返回 token/refreshToken/user', async () => {
    const { supabaseLogin } = await import('../api/auth');
    vi.mocked(supabaseLogin).mockResolvedValueOnce({
      session: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh',
        user: {
          id: 'user-1',
          email: 'admin@example.com',
          user_metadata: { nickname: '管理员' },
        },
      } as unknown as import('../lib/supabase').Session,
      user: {
        id: 'user-1',
        username: 'admin@example.com',
        nickname: '管理员',
      },
    });

    const result = await authApi.login({
      username: 'admin',
      password: '123456',
    });

    expect(result.token).toBe('mock-access-token');
    expect(result.refreshToken).toBe('mock-refresh');
    expect(result.user).toEqual({
      id: 'user-1',
      username: 'admin@example.com',
      nickname: '管理员',
    });
  });

  it('menus 返回菜单树（含本地页与 appName 子应用分支）', async () => {
    const menus = await fetchMenus();
    expect(menus).toEqual(mockMenus);
    const sys = menus.find((m) => m.appName === 'iam');
    expect(
      sys?.children?.some((c) => c.permission === 'system:user:list'),
    ).toBe(true);
  });
});
