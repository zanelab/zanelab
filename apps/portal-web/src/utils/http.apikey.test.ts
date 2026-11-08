import { cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import httpService from './http';
import { appConfig } from '../config';

/*
 * apikey 注入（任务 11-05）：请求拦截器读 config.js 的 api.apiKey，
 * 非空才注入 apikey 头（生产链路的唯一注入点——vite proxy 不再注入）。
 * appConfig 是模块级单例 → 用 vi.spyOn 改读值模拟「config.js 配了/没配」。
 */
import { vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('请求拦截器 × apikey 注入', () => {
  it('api.apiKey 非空 → 请求头携带 apikey', async () => {
    const spy = vi
      .spyOn(appConfig.api, 'apiKey', 'get')
      .mockReturnValue('test-key-123');
    let seen: string | null = null;
    server.use(
      http.get('/api/echo-headers', ({ request }) => {
        seen = request.headers.get('apikey');
        return HttpResponse.json({ code: 0, data: null, msg: 'ok' });
      }),
    );
    await httpService.get('/api/echo-headers');
    expect(seen).toBe('test-key-123');
    spy.mockRestore();
  });

  it('api.apiKey 空 → 不注入（头缺失）', async () => {
    const spy = vi
      .spyOn(appConfig.api, 'apiKey', 'get')
      .mockReturnValue(undefined);
    let seen: string | null = 'sentinel';
    server.use(
      http.get('/api/echo-headers', ({ request }) => {
        seen = request.headers.get('apikey');
        return HttpResponse.json({ code: 0, data: null, msg: 'ok' });
      }),
    );
    await httpService.get('/api/echo-headers');
    expect(seen).toBeNull();
    spy.mockRestore();
  });
});
