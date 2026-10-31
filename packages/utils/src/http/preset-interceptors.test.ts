import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, describe, expect, it } from 'vitest';

import { RequestClient } from './request-client';
import {
  authenticateResponseInterceptor,
  errorMessageResponseInterceptor,
} from './preset-interceptors';

describe('authenticateResponseInterceptor（401 单飞 + tokenHeaderName）', () => {
  let mock: MockAdapter;
  let client: RequestClient;
  let refreshCalls: number;
  let reAuthCalls: number;

  function buildClient(enableRefreshToken = true) {
    mock = new MockAdapter(axios);
    refreshCalls = 0;
    reAuthCalls = 0;
    client = new RequestClient({ responseReturn: 'body' });
    client.addResponseInterceptor(
      authenticateResponseInterceptor({
        client,
        doReAuthenticate: async () => {
          reAuthCalls++;
        },
        doRefreshToken: async () => {
          refreshCalls++;
          return 'new-token';
        },
        enableRefreshToken,
        formatToken: (t) => t,
        tokenHeaderName: 'X-Token',
      }),
    );
  }

  afterEach(() => {
    mock.reset();
  });

  it('并发 401：refresh 只调一次，排队请求以新 token 重放', async () => {
    buildClient();
    let tokenSeen = '';
    mock.onGet('/api/a').reply((config) => {
      const t = config.headers?.['X-Token'];
      if (t === 'expired') return [401, null];
      tokenSeen = String(t);
      return [200, { ok: true }];
    });
    mock.onGet('/api/b').reply((config) => {
      const t = config.headers?.['X-Token'];
      if (t === 'expired') return [401, null];
      tokenSeen = String(t);
      return [200, { ok: true }];
    });

    const [r1, r2] = (await Promise.all([
      client.get<any>('/api/a', { headers: { 'X-Token': 'expired' } }),
      client.get<any>('/api/b', { headers: { 'X-Token': 'expired' } }),
    ])) as [{ data: unknown }, { data: unknown }];

    expect(r1.data).toEqual({ ok: true });
    expect(r2.data).toEqual({ ok: true });
    expect(refreshCalls).toBe(1);
    expect(tokenSeen).toBe('new-token');
  });

  it('重放请求头写 tokenHeaderName（非 Authorization）', async () => {
    buildClient();
    let replayHeader: unknown;
    mock.onGet('/single').reply((config) => {
      const t = config.headers?.['X-Token'];
      if (t === 'expired') return [401, null];
      replayHeader = config.headers?.['X-Token'];
      return [200, { ok: true }];
    });

    await client.get('/single', { headers: { 'X-Token': 'expired' } });
    expect(refreshCalls).toBe(1);
    expect(replayHeader).toBe('new-token');
  });

  it('刷新失败 → doReAuthenticate 被调用并抛出刷新错误', async () => {
    mock = new MockAdapter(axios);
    reAuthCalls = 0;
    client = new RequestClient({ responseReturn: 'body' });
    client.addResponseInterceptor(
      authenticateResponseInterceptor({
        client,
        doReAuthenticate: async () => {
          reAuthCalls++;
        },
        doRefreshToken: async () => {
          throw new Error('refresh failed');
        },
        enableRefreshToken: true,
        formatToken: (t) => t,
      }),
    );

    mock.onGet('/fail').reply((config) => {
      if (config.headers?.['X-Token'] === 'expired') return [401, null];
      return [200, {}];
    });

    await expect(
      client.get('/fail', { headers: { 'X-Token': 'expired' } }),
    ).rejects.toThrow('refresh failed');
    expect(reAuthCalls).toBe(1);
  });

  it('enableRefreshToken=false：直接 doReAuthenticate + 抛出原错误', async () => {
    buildClient(false);
    mock.onGet('/no-refresh').reply(() => [401, { code: 401 }]);

    // client.request() 对非 2xx 抛 error.response.data（vben 语义）
    await expect(client.get('/no-refresh')).rejects.toEqual({ code: 401 });
    expect(reAuthCalls).toBe(1);
    expect(refreshCalls).toBe(0);
  });

  it('非 401 错误原样透传（不触发刷新）', async () => {
    buildClient();
    mock.onGet('/err403').reply(() => [403, { code: 403 }]);

    await expect(client.get('/err403')).rejects.toEqual({ code: 403 });
    expect(refreshCalls).toBe(0);
    expect(reAuthCalls).toBe(0);
  });

  it('未提供 tokenHeaderName：默认写 Authorization（vben 原版行为）', async () => {
    mock = new MockAdapter(axios);
    client = new RequestClient({ responseReturn: 'body' });
    client.addResponseInterceptor(
      authenticateResponseInterceptor({
        client,
        doReAuthenticate: async () => {},
        doRefreshToken: async () => 'new-token',
        enableRefreshToken: true,
        formatToken: (t) => `Bearer ${t}`,
      }),
    );

    let replayAuth: unknown;
    mock.onGet('/auth-default').reply((config) => {
      const a = config.headers?.Authorization;
      if (a === 'Bearer expired') return [401, null];
      replayAuth = a;
      return [200, {}];
    });

    await client.get('/auth-default', {
      headers: { Authorization: 'Bearer expired' },
    });
    expect(replayAuth).toBe('Bearer new-token');
  });
});

describe('errorMessageResponseInterceptor（文案注入）', () => {
  let mock: MockAdapter;
  let client: RequestClient;

  function build(
    options?: Parameters<typeof errorMessageResponseInterceptor>[1],
  ) {
    mock = new MockAdapter(axios);
    const messages: string[] = [];
    client = new RequestClient({ responseReturn: 'raw' });
    client.addResponseInterceptor(
      errorMessageResponseInterceptor((msg) => {
        messages.push(msg);
      }, options),
    );
    return messages;
  }

  afterEach(() => {
    mock.reset();
  });

  it('状态码命中注入的 resolveStatusMessage', async () => {
    const messages = build({
      resolveStatusMessage: (status) =>
        status === 403 ? '无权限访问' : `HTTP ${status}`,
    });
    mock.onGet('/forbidden').reply(() => [403, { code: 403 }]);

    await expect(client.get('/forbidden')).rejects.toEqual({ code: 403 });
    expect(messages).toEqual(['无权限访问']);
  });

  it('未注入 → 英文回落文案（404）', async () => {
    const messages = build();
    mock.onGet('/nf').reply(() => [404, { code: 404 }]);

    await expect(client.get('/nf')).rejects.toEqual({ code: 404 });
    expect(messages).toEqual(['Not Found']);
  });

  it('未匹配状态码（5xx）→ default 文案', async () => {
    const messages = build();
    mock.onGet('/srv').reply(() => [503, null]);

    await expect(client.get('/srv')).rejects.toBeNull();
    expect(messages).toEqual(['Internal server error']);
  });

  it('网络错误 → resolveNetworkMessage(network)', async () => {
    const messages = build({
      resolveNetworkMessage: (kind) =>
        kind === 'network' ? '网络连接异常' : '请求超时',
    });
    mock.onGet('/net').networkError();

    // 网络错误无 response → request() 抛原 axios error（isAxiosError）
    await expect(client.get('/net')).rejects.toMatchObject({
      isAxiosError: true,
    });
    expect(messages).toEqual(['网络连接异常']);
  });

  it('超时 → resolveNetworkMessage(timeout)', async () => {
    const messages = build({
      resolveNetworkMessage: (kind) =>
        kind === 'network' ? '网络连接异常' : '请求超时',
    });
    mock.onGet('/slow').timeout();

    await expect(client.get('/slow')).rejects.toMatchObject({
      code: 'ECONNABORTED',
    });
    expect(messages).toEqual(['请求超时']);
  });

  it('resolveNetworkMessage 返回 null → 网络/超时不提示（选择性策略）', async () => {
    const messages = build({
      resolveNetworkMessage: () => null,
    });
    mock.onGet('/net-null').networkError();

    await expect(client.get('/net-null')).rejects.toMatchObject({
      isAxiosError: true,
    });
    expect(messages).toEqual([]); // null = 跳过，不回落英文
  });

  it('resolveNetworkMessage 返回空串 → 回落内置英文映射', async () => {
    const messages = build({
      resolveNetworkMessage: () => '',
    });
    mock.onGet('/net-empty').networkError();

    await expect(client.get('/net-empty')).rejects.toMatchObject({
      isAxiosError: true,
    });
    expect(messages).toEqual(['Network error, please check your connection']);
  });

  it('resolveStatusMessage 返回 null → 该状态不提示', async () => {
    const messages = build({
      resolveStatusMessage: (status) => (status === 400 ? '参数错误' : null), // 其余状态码跳过
    });
    mock.onGet('/pass').reply(() => [404, null]);

    await expect(client.get('/pass')).rejects.toBeNull();
    expect(messages).toEqual([]); // 404 未提示
  });

  it('makeErrorMessage 收到 (message, error) 两参', async () => {
    const messages: string[] = [];
    const seenErrors: any[] = [];
    mock = new MockAdapter(axios);
    client = new RequestClient({ responseReturn: 'raw' });
    client.addResponseInterceptor(
      errorMessageResponseInterceptor((msg, error) => {
        messages.push(msg);
        seenErrors.push(error);
      }),
    );
    mock.onGet('/x').reply(() => [400, { code: 400 }]);

    await expect(client.get('/x')).rejects.toEqual({ code: 400 });
    expect(messages).toEqual(['Bad request']);
    expect(seenErrors[0]).toMatchObject({ response: { status: 400 } });
  });
});
