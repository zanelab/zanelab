import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { resetMenuMock } from '../mocks/menu-handlers';
import { resetUserMock } from '../mocks/user-handlers';
import { get as httpGet } from './http';

/*
 * 401 单飞刷新（独立态链路，任务：token refresh）：
 * 首请求 401（token 过期）→ 自动 POST /auth/refresh（mock：有效 refresh_token
 * 双 token 轮换）→ 重放携带新 token → 成功。全程页面无感。
 */

afterEach(() => {
  resetMenuMock();
  resetUserMock();
  server.resetHandlers();
});

describe('401 单飞刷新（独立态）', () => {
  beforeEach(() => {
    localStorage.setItem('iam_token', 'expired-token');
    localStorage.setItem('iam_refresh_token', 'mock-iam-refresh-token');
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
});
