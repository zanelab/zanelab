import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { resetMenuMock } from '../mocks/menu-handlers';
import { resetUserMock } from '../mocks/user-handlers';
import { notify } from '@zanelab/utils';
import { get as httpGet } from './http';

/*
 * 401 单飞刷新（独立态链路，任务：token refresh）：
 * 首请求 401（token 过期）→ 自动 POST /auth/refresh（mock：有效 refresh_token
 * 双 token 轮换）→ 重放携带新 token → 成功。全程页面无感。
 *
 * 网关鉴权（任务 11-21-refresh-apikey-fix）：/auth/refresh 匿名端点但网关层仍
 * 要求 apikey——独立态 fetch 补 VITE_API_KEY；未配置/网关 401 属配置错误，
 * 不跳登录（保留登录态）；GoTrue 业务 401 仍跳登录。
 */

afterEach(() => {
  resetMenuMock();
  resetUserMock();
  server.resetHandlers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/** 网关 401 的真实响应体形态（2026-11-21 curl 实测，F4） */
const gateway401Body = {
  source: '@supabase/server',
  code: 'MISSING_CREDENTIALS',
  message: 'Missing authorization header',
  received: { apikey: 'absent', authorization: 'absent' },
};

describe('401 单飞刷新（独立态）', () => {
  beforeEach(() => {
    localStorage.setItem('iam_token', 'expired-token');
    localStorage.setItem('iam_refresh_token', 'mock-iam-refresh-token');
    // 独立态默认模拟 .env 已配置（与本地开发填了 VITE_API_KEY 对齐）；
    // 「未配置」用例内显式 stub 为 undefined
    vi.stubEnv('VITE_API_KEY', 'test-api-key-123');
  });
  afterEach(() => {
    localStorage.removeItem('iam_token');
    localStorage.removeItem('iam_refresh_token');
  });

  it('401 → 刷新（双 token 覆盖）→ 重放成功；最终请求带新 token', async () => {
    let firstCall = true;
    let replayAuthorization: string | null = null;
    server.use(
      http.get('*/functions/v1/iam/auth/users', ({ request }) => {
        const auth = request.headers.get('authorization') ?? '';
        if (firstCall) {
          firstCall = false;
          return new HttpResponse(null, { status: 401 }); // 模拟 token 过期
        }
        replayAuthorization = auth;
        return HttpResponse.json({ code: 0, data: [], msg: 'ok' });
      }),
    );

    const users = await httpGet('/functions/v1/iam/auth/users');
    expect(users).toEqual([]);
    // 重放带的是刷新后的新 token（不是过期的旧值）
    expect(replayAuthorization).toBe('Bearer mock-iam-access-token-rotated');
    // 双 token 轮换已覆盖本地（下一次刷新用新 refresh_token）
    expect(localStorage.getItem('iam_token')).toBe(
      'mock-iam-access-token-rotated',
    );
    expect(localStorage.getItem('iam_refresh_token')).toBe(
      'mock-iam-refresh-token',
    );
  });

  it('refresh 请求携带 apikey 头（VITE_API_KEY 同源注入）', async () => {
    let refreshApikey: string | null = null;
    let firstCall = true;
    server.use(
      http.post('*/functions/v1/iam/auth/refresh', ({ request }) => {
        refreshApikey = request.headers.get('apikey');
        return HttpResponse.json({
          code: 0,
          data: {
            token: 'mock-iam-access-token-rotated',
            refreshToken: 'mock-iam-refresh-token',
          },
        });
      }),
      http.get('*/functions/v1/iam/auth/users', ({ request }) => {
        // 仅首请求 401：重放已带新 token → 返回 ok（否则刷新→重放→401 死循环）
        if (firstCall) {
          firstCall = false;
          return new HttpResponse(null, { status: 401 });
        }
        expect(request.headers.get('apikey')).toBe('test-api-key-123');
        return HttpResponse.json({ code: 0, data: [], msg: 'ok' });
      }),
    );
    const users = await httpGet('/functions/v1/iam/auth/users');
    expect(users).toEqual([]);
    expect(refreshApikey).toBe('test-api-key-123');
  });

  it('刷新失败（refresh_token 失效 → 1004/401）→ 跳登录（location.replace 被调用）', async () => {
    localStorage.setItem('iam_refresh_token', 'stale-token');
    const replace = vi.fn();
    vi.stubGlobal('location', { ...window.location, replace });
    server.use(
      http.post('*/functions/v1/iam/auth/refresh', () =>
        HttpResponse.json(
          { code: 1004, data: null, msg: '登录已过期，请重新登录' },
          { status: 401 },
        ),
      ),
      http.get(
        '*/functions/v1/iam/auth/users',
        () => new HttpResponse(null, { status: 401 }),
      ),
    );
    await expect(httpGet('/functions/v1/iam/auth/users')).rejects.toBeTruthy();
    expect(replace).toHaveBeenCalledWith('/login');
    vi.unstubAllGlobals();
  });

  it('VITE_API_KEY 未配置 → 发请求前失败：console.error + notify、不跳登录、token 保留', async () => {
    vi.stubEnv('VITE_API_KEY', '');
    const replace = vi.fn();
    vi.stubGlobal('location', { ...window.location, replace });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const notifySpy = vi.spyOn(notify, 'error').mockImplementation(() => {});
    let refreshCalled = false;
    server.use(
      http.post('*/functions/v1/iam/auth/refresh', () => {
        refreshCalled = true;
        return HttpResponse.json({ code: 0, data: null });
      }),
      http.get(
        '*/functions/v1/iam/auth/users',
        () => new HttpResponse(null, { status: 401 }),
      ),
    );
    await expect(httpGet('/functions/v1/iam/auth/users')).rejects.toThrow(
      /misconfigured|apikey/i,
    );
    expect(refreshCalled).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('网关拒绝'),
      expect.stringContaining('VITE_API_KEY'),
    );
    expect(notifySpy).toHaveBeenCalledWith(
      expect.stringContaining('refresh 端点被网关拒绝'),
    );
    // 配置错误 ≠ 会话失效：不跳登录、凭据保留
    expect(replace).not.toHaveBeenCalled();
    expect(localStorage.getItem('iam_token')).toBe('expired-token');
    expect(localStorage.getItem('iam_refresh_token')).toBe(
      'mock-iam-refresh-token',
    );
    vi.unstubAllGlobals();
  });

  it('网关 401（source=@supabase/server）→ 不跳登录、token 保留', async () => {
    const replace = vi.fn();
    vi.stubGlobal('location', { ...window.location, replace });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const notifySpy = vi.spyOn(notify, 'error').mockImplementation(() => {});
    server.use(
      http.post('*/functions/v1/iam/auth/refresh', ({ request }) => {
        expect(request.headers.get('apikey')).toBe('test-api-key-123');
        return HttpResponse.json(gateway401Body, { status: 401 });
      }),
      http.get(
        '*/functions/v1/iam/auth/users',
        () => new HttpResponse(null, { status: 401 }),
      ),
    );
    await expect(httpGet('/functions/v1/iam/auth/users')).rejects.toThrow(
      /gateway|网关/i,
    );
    expect(errorSpy).toHaveBeenCalled();
    expect(notifySpy).toHaveBeenCalledWith(
      expect.stringContaining('refresh 端点被网关拒绝'),
    );
    expect(replace).not.toHaveBeenCalled();
    expect(localStorage.getItem('iam_token')).toBe('expired-token');
    vi.unstubAllGlobals();
  });
});
