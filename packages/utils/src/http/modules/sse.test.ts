import type { RequestClient } from '../request-client';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SSE } from './sse';

// vben sse.test.ts 等价移植：fetch mock + 分块 TextDecoder 流读。
const OriginalTextDecoder = globalThis.TextDecoder;

const createFetchMock = (chunks: string[], ok = true) => {
  const encoder = new TextEncoder();
  let index = 0;
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    body: {
      getReader: () => ({
        read: async () => {
          if (index < chunks.length) {
            return { done: false, value: encoder.encode(chunks[index++]) };
          }
          return { done: true, value: undefined };
        },
        releaseLock: vi.fn(),
      }),
    },
  });
};

describe('SSE', () => {
  let client: RequestClient;
  let sse: SSE;
  let fetchMock: ReturnType<typeof createFetchMock>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('TextDecoder', class extends OriginalTextDecoder {});
    fetchMock = createFetchMock(['hello ', 'stream']);
    vi.stubGlobal('fetch', fetchMock);
    client = {
      getBaseUrl: () => 'http://localhost',
      instance: {
        interceptors: { request: { handlers: [] } },
        defaults: { baseURL: 'http://localhost' },
      },
    } as unknown as RequestClient;
    sse = new SSE(client);
  });

  it('requestSSE 分块流读：onMessage 逐块回调、结束后 onEnd 一次', async () => {
    const messages: string[] = [];
    let ended = 0;
    await sse.requestSSE('/events', undefined, {
      onMessage: (message) => messages.push(message),
      onEnd: () => ended++,
    });
    expect(messages).toEqual(['hello ', 'stream']);
    expect(ended).toBe(1);
  });

  it('非 2xx → 抛 HTTP error', async () => {
    fetchMock = createFetchMock([], false);
    vi.stubGlobal('fetch', fetchMock);
    await expect(sse.requestSSE('/bad')).rejects.toThrow('HTTP error');
  });

  it('postSSE：method POST、JSON body 按拦截器 Content-Type 序列化、accept 头补齐', async () => {
    // JSON 序列化条件是「重放链里的 headers 含 Content-Type: application/json」
    // （axios defaults 不参与拦截器重放，业务拦截器需自行带 Content-Type——
    // portal/legacy headers 拦截器即如此）。此处模拟该场景。
    const handlers = client.instance.interceptors.request.handlers!;
    handlers.push({
      fulfilled: (config: { headers: Record<string, string> }) => {
        config.headers['Content-Type'] = 'application/json;charset=utf-8';
        return config;
      },
    } as never);
    await sse.postSSE('/chat', { q: 'hi' });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ q: 'hi' }));
    const headers = init.headers as Headers;
    expect(headers.get('accept')).toBe('text/event-stream');
  });

  it('请求拦截器的 headers 被重放进 fetch（token 透传）', async () => {
    const handlers = client.instance.interceptors.request.handlers!;
    handlers.push({
      fulfilled: (config: { headers: Record<string, string> }) => {
        config.headers['X-Token'] = 'tok-1';
        return config;
      },
    } as never);
    await sse.requestSSE('/events');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Headers).get('X-Token')).toBe('tok-1');
  });
});
