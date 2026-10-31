import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { authApi } from '../api/auth';
import { fetchMenus } from '../api/menu';
import { ToastRegion } from '@zanelab/ui';
import { notify } from '@zanelab/utils';
import { mockMenus } from '../mocks/handlers';
import { server } from '../mocks/server';
import { useAuthStore, initialAuthState } from '../stores/auth-store';

afterEach(() => {
  cleanup();
  useAuthStore.setState(initialAuthState);
});

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
  it('业务码非 0（登录错误）→ notify + reject', async () => {
    render(<ToastRegion />);
    await act(async () => {
      await expect(
        authApi.login({ username: 'admin', password: 'wrong' }),
      ).rejects.toThrow('用户名或密码错误');
    });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('用户名或密码错误');
    expect(alert.className).toContain('alert-error');
  });

  it('HTTP 500（menus 端点）→ notify 服务器错误', async () => {
    server.use(
      http.get('/api/user/menus', () =>
        HttpResponse.json(null, { status: 500 }),
      ),
    );
    render(<ToastRegion />);
    await act(async () => {
      // vben request() 语义：非 2xx 抛 error.response.data（此处 body 为 null）
      await expect(fetchMenus()).rejects.toBeNull();
    });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('服务器错误，请稍后重试');
  });
});

describe('MSW handler 契约（父 design §4）', () => {
  it('login 成功返回旧项目 LoginResponseVO 经 mapLoginResult 映射后的登录态', async () => {
    const result = await authApi.login({
      username: 'admin',
      password: '123456',
    });

    expect(result.token).toBe('mock-access-token');

    // mock 侧补 refreshToken（与 /sys/auth/refresh 校验值一致）打通 401 单飞链路
    expect(result.refreshToken).toBe('mock-refresh-token');

    expect(result.user).toEqual({
      id: 1,
      username: '管理员',
      nickname: '管理员',
    });
  });

  it('menus 无 token → 公开菜单子集（home），有 token → 全量', async () => {
    // 未登录
    const publicMenus = await fetchMenus();
    expect(JSON.parse(JSON.stringify(publicMenus))).toEqual([mockMenus[0]]);

    // 登录后（拦截器带 token）
    useAuthStore.getState().setToken('mock-access-token');
    const menus = await fetchMenus();
    expect(JSON.parse(JSON.stringify(menus))).toEqual(mockMenus);
    const sys = menus.find((m) => m.appName === 'iam');
    expect(sys?.children?.length).toBe(3);
  });
});
