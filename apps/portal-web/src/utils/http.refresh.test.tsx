import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import {
  classifyRefreshError,
  default as httpService,
  refreshToken,
  type RefreshErrorKind,
} from './http';
import { appConfig } from '../config';
import { useAuthStore, initialAuthState } from '../stores/auth-store';
import { ToastRegion } from '@zanelab/ui';

/*
 * refreshToken 链路（任务 11-21-refresh-apikey-fix）：
 * /auth/refresh 是匿名端点（Edge Fn 不校验 JWT），但 Supabase 平台网关层仍要求
 * apikey——裸 fetch 漏发时网关以 401 MISSING_CREDENTIALS 拦截（响应体
 * source=@supabase/server），请求到不了 Edge Function。此前被误归为会话失效
 * （handleLogout）——任何持有效 refresh token 的用户刷新页面即被强制登出。
 */

const REFRESH_PATH = '/iam/functions/v1/iam/auth/refresh';

/** 网关 401 的真实响应体形态（2026-11-21 curl 实测，F4） */
const gateway401Body = {
  code: 401,
  error_response: {
    code: 401,
    message: 'Missing authorization header',
    msg: 'Missing authorization header',
    reference_id: 'x',
  },
  message: 'Missing authorization header',
  msg: 'Missing authorization header',
  received: { apikey: 'absent', authorization: 'absent' },
  source: '@supabase/server',
};

function okTokenBody(overrides?: Partial<Record<string, unknown>>) {
  return {
    code: 0,
    data: { token: 'new-access-token', refreshToken: 'mock-refresh-token' },
    msg: 'ok',
    ...overrides,
  };
}

/** 渲染 ToastRegion 后轮询出第一条 alert（notify 暂存机制补发，dev 环境同步可达） */
async function renderToastAndGetAlert(): Promise<HTMLElement> {
  render(<ToastRegion />);
  for (let i = 0; i < 50; i++) {
    const el = document.querySelector('[role="alert"]');
    if (el) return el as HTMLElement;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error('alert not rendered');
}

/**
 * jsdom 无 window.__APP_CONFIG__ → appConfig 回退 DEFAULT_CONFIG
 * （publishableKey: undefined）。发请求的用例（AC1/AC3/业务401）必须先模拟
 * 「config.js 已配置 key」，否则命中发请求前置检查（与被测分支无关）。
 */
function mockKeyConfigured(key = 'test-key-123') {
  return vi.spyOn(appConfig.api, 'publishableKey', 'get').mockReturnValue(key);
}

beforeEach(() => {
  localStorage.setItem('portal_refresh_token', 'mock-refresh-token');
  localStorage.setItem('portal_token', 'expired-token');
  useAuthStore.getState().setToken('expired-token');
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  useAuthStore.setState(initialAuthState);
  vi.restoreAllMocks();
});

describe('refreshToken × apikey（网关鉴权）', () => {
  it('publishableKey 已配置 → refresh 请求携带 apikey 头（AC1）', async () => {
    const spy = mockKeyConfigured();
    let seen: string | null = null;
    server.use(
      http.post(REFRESH_PATH, ({ request }) => {
        seen = request.headers.get('apikey');
        return HttpResponse.json(okTokenBody());
      }),
    );
    await expect(refreshToken()).resolves.toBe('new-access-token');
    expect(seen).toBe('test-key-123');
    spy.mockRestore();
  });

  it('publishableKey 未配置 → 发请求前即失败：不 fetch、console.error + notify、不触发 global-logout（AC2）', async () => {
    const spy = vi
      .spyOn(appConfig.api, 'publishableKey', 'get')
      .mockReturnValue(undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let fetchCalled = false;
    server.use(
      http.post(REFRESH_PATH, () => {
        fetchCalled = true;
        return HttpResponse.json(okTokenBody());
      }),
    );
    const logoutSpy = vi.fn();
    window.addEventListener('global-logout', logoutSpy);

    render(<ToastRegion />);
    await act(async () => {
      await expect(refreshToken()).rejects.toThrow(
        /misconfigured|publishable key/i,
      );
    });
    expect(fetchCalled).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('MISSING_CREDENTIALS'),
      expect.stringContaining('publishableKey'),
    );
    const alert = await renderToastAndGetAlert();
    expect(alert).toHaveTextContent(/refresh 端点被网关拒绝/);
    expect(logoutSpy).not.toHaveBeenCalled();
    // 登录态保留：token 未被清除
    expect(localStorage.getItem('portal_token')).toBe('expired-token');

    window.removeEventListener('global-logout', logoutSpy);
    spy.mockRestore();
  });

  it('网关 401（source=@supabase/server）→ 不登出：console.error + notify + token 保留（AC3 gateway 侧）', async () => {
    const spy = mockKeyConfigured();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logoutSpy = vi.fn();
    window.addEventListener('global-logout', logoutSpy);
    server.use(
      http.post(REFRESH_PATH, ({ request }) => {
        // 网关拦的是无 apikey 请求；带 key 仍发网关 401 形态（mock 模拟部署错）
        expect(request.headers.get('apikey')).toBe('test-key-123');
        return HttpResponse.json(gateway401Body, { status: 401 });
      }),
    );
    render(<ToastRegion />);
    await act(async () => {
      await expect(refreshToken()).rejects.toThrow(/gateway|网关/i);
    });
    expect(errorSpy).toHaveBeenCalled();
    const alert = await renderToastAndGetAlert();
    expect(alert).toHaveTextContent(/refresh 端点被网关拒绝/);
    expect(logoutSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem('portal_token')).toBe('expired-token');
    window.removeEventListener('global-logout', logoutSpy);
    spy.mockRestore();
  });

  it('GoTrue 业务 401（code:1004，无 source）→ 原失效链路（classifyRefreshError → invalid）', async () => {
    const spy = mockKeyConfigured();
    server.use(
      http.post(REFRESH_PATH, ({ request }) => {
        // 带 apikey（业务 401 的响应体是 Edge Fn envelope，无 source 字段）
        expect(request.headers.get('apikey')).toBe('test-key-123');
        return HttpResponse.json(
          { code: 1004, data: null, msg: '登录已过期，请重新登录' },
          { status: 401 },
        );
      }),
    );
    await act(async () => {
      await expect(refreshToken()).rejects.toThrow('refresh rejected: 401');
    });
    expect(classifyRefreshError(new Error('refresh rejected: 401'))).toBe(
      'invalid',
    );
    spy.mockRestore();
  });

  it('classifyRefreshError：gateway 标记错误 → gateway；TypeError → network；带 401 status → invalid', () => {
    const gatewayErr = Object.assign(new Error('x'), { kind: 'gateway' });
    expect(classifyRefreshError(gatewayErr)).toBe<RefreshErrorKind>('gateway');
    expect(classifyRefreshError(new TypeError('Failed to fetch'))).toBe(
      'network',
    );
    const statusErr = Object.assign(new Error('x'), { status: 401 });
    expect(classifyRefreshError(statusErr)).toBe('invalid');
    expect(classifyRefreshError(new Error('plain'))).toBe('invalid');
  });
});

describe('运行期 401 单飞 × 网关配置错误（R3）', () => {
  it('业务请求 401 → refresh 被网关 401 拒绝 → 不 handleLogout（global-logout 不触发）、token 保留、notify 弹出', async () => {
    const spy = mockKeyConfigured();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const logoutSpy = vi.fn();
    window.addEventListener('global-logout', logoutSpy);
    server.use(
      http.post(REFRESH_PATH, () =>
        HttpResponse.json(gateway401Body, { status: 401 }),
      ),
      http.get('/api/protected', () => new HttpResponse(null, { status: 401 })),
    );
    render(<ToastRegion />);
    await act(async () => {
      await expect(httpService.get('/api/protected')).rejects.toBeTruthy();
    });
    // 配置错误 ≠ 会话失效：不清登录态、不广播登出
    expect(logoutSpy).not.toHaveBeenCalled();
    expect(useAuthStore.getState().token).toBe('expired-token');
    expect(localStorage.getItem('portal_token')).toBe('expired-token');
    // 用户可见原因已弹出
    const alert = await renderToastAndGetAlert();
    expect(alert).toHaveTextContent(/refresh 端点被网关拒绝/);
    window.removeEventListener('global-logout', logoutSpy);
    spy.mockRestore();
  });
});
