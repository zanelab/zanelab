import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { defaultResponseInterceptor } from './preset-interceptors';
import { RequestClient } from './request-client';

describe('requestClient', () => {
  let mock: MockAdapter;
  let requestClient: RequestClient;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    requestClient = new RequestClient();
  });

  afterEach(() => {
    mock.reset();
  });

  it('should successfully make a GET request', async () => {
    mock.onGet('test/url').reply(200, { data: 'response' });

    const response = await requestClient.get('test/url');

    expect(response.data).toEqual({ data: 'response' });
  });

  it('should successfully make a POST request', async () => {
    const postData = { key: 'value' };
    const mockData = { data: 'response' };
    mock.onPost('/test/post', postData).reply(200, mockData);
    const response = await requestClient.post('/test/post', postData);
    expect(response.data).toEqual(mockData);
  });

  it('should successfully make a PUT request', async () => {
    const putData = { key: 'updatedValue' };
    const mockData = { data: 'updated response' };
    mock.onPut('/test/put', putData).reply(200, mockData);
    const response = await requestClient.put('/test/put', putData);
    expect(response.data).toEqual(mockData);
  });

  it('should successfully make a DELETE request', async () => {
    const mockData = { data: 'delete response' };
    mock.onDelete('/test/delete').reply(200, mockData);
    const response = await requestClient.delete('/test/delete');
    expect(response.data).toEqual(mockData);
  });

  it('should handle network errors', async () => {
    mock.onGet('/test/error').networkError();
    await expect(requestClient.get('/test/error')).rejects.toMatchObject({
      isAxiosError: true,
      message: 'Network Error',
    });
  });

  it('should handle timeout', async () => {
    mock.onGet('/test/timeout').timeout();
    await expect(requestClient.get('/test/timeout')).rejects.toMatchObject({
      isAxiosError: true,
      code: 'ECONNABORTED',
    });
  });

  it('should successfully upload a file', async () => {
    const fileData = new Blob(['file contents'], { type: 'text/plain' });

    mock.onPost('/test/upload').reply((config) => {
      return config.data instanceof FormData && config.data.has('file')
        ? [200, { data: 'file uploaded' }]
        : [400, { error: 'Bad Request' }];
    });

    const response = await requestClient.upload('/test/upload', {
      file: fileData,
    });
    expect(response.data).toEqual({ data: 'file uploaded' });
  });

  it('should successfully download a file as a blob', async () => {
    const mockFileContent = new Blob(['mock file content'], {
      type: 'text/plain',
    });

    mock.onGet('/test/download').reply(200, mockFileContent);

    const res = await requestClient.download<any>('/test/download');

    expect(res.data).toBeInstanceOf(Blob);
  });
});

describe('requestClient 解包三态（defaultResponseInterceptor 组合）', () => {
  let mock: MockAdapter;
  let client: RequestClient;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    client = new RequestClient({ responseReturn: 'data' });
    client.addResponseInterceptor(defaultResponseInterceptor({}));
  });

  afterEach(() => {
    mock.reset();
  });

  it("responseReturn 'data'：envelope 成功 → 返回 data 字段", async () => {
    mock.onGet('/env').reply(200, { code: 0, data: { ok: true }, msg: 'x' });
    await expect(client.get('/env')).resolves.toEqual({ ok: true });
  });

  it("responseReturn 'data'：envelope 失败码 → request() 抛出 response body（vben 语义）", async () => {
    mock.onGet('/env-bad').reply(200, { code: 500, data: null, msg: 'boom' });
    await expect(client.get('/env-bad')).rejects.toEqual({
      code: 500,
      data: null,
      msg: 'boom',
    });
  });

  it("responseReturn 'data'：非 envelope（无 code 对象）→ 按 body 语义放行（本仓库守卫）", async () => {
    mock.onGet('/plain-obj').reply(200, { foo: 'bar' });
    await expect(client.get('/plain-obj')).resolves.toEqual({ foo: 'bar' });
  });

  it("responseReturn 'data'：纯文本 body → 放行", async () => {
    mock.onGet('/text').reply(200, 'plain text');
    await expect(client.get('/text')).resolves.toBe('plain text');
  });

  it("responseReturn 'data'：blob body → 放行", async () => {
    mock.onGet('/blob').reply(200, new Blob(['x']));
    const res = await client.get('/blob');
    expect(res).toBeInstanceOf(Blob);
  });

  it("responseReturn 'body'：返回整个 body（含 code）", async () => {
    const bodyClient = new RequestClient({ responseReturn: 'body' });
    bodyClient.addResponseInterceptor(defaultResponseInterceptor({}));
    const envelope = { code: 0, data: { ok: true }, msg: 'x' };
    mock.onGet('/env2').reply(200, envelope);
    await expect(bodyClient.get('/env2')).resolves.toEqual(envelope);
  });

  it('responseReturn raw（默认）：原样 AxiosResponse', async () => {
    const rawClient = new RequestClient();
    rawClient.addResponseInterceptor(defaultResponseInterceptor({}));
    mock.onGet('/env3').reply(200, { code: 0, data: { ok: true }, msg: 'x' });
    const res = await rawClient.get<any>('/env3');
    expect(res).toMatchObject({ status: 200 });
  });

  it('successCode 函数形式（portal 成功码集合）', async () => {
    const fnClient = new RequestClient({ responseReturn: 'data' });
    fnClient.addResponseInterceptor(
      defaultResponseInterceptor({
        successCode: (code: unknown) =>
          [0, '0', '10000'].includes(code as string | number),
      }),
    );
    mock
      .onGet('/legacy-ok')
      .reply(200, { code: '10000', data: { list: [1] }, msg: 'ok' });
    await expect(fnClient.get('/legacy-ok')).resolves.toEqual({ list: [1] });
  });

  it('HTTP 非 2xx + responseReturn data → request() 抛出 response body', async () => {
    mock.onGet('/err500').reply(500, { message: 'server down' });
    await expect(client.get('/err500')).rejects.toEqual({
      message: 'server down',
    });
  });
});

describe('paramsSerializer 预置（qs arrayFormat）', () => {
  function buildClient(
    format: 'brackets' | 'comma' | 'indices' | 'repeat',
  ): RequestClient {
    return new RequestClient({ paramsSerializer: format });
  }

  it('构造期已把字符串预设转换为 qs 序列化函数', () => {
    for (const format of ['brackets', 'comma', 'indices', 'repeat'] as const) {
      expect(
        typeof buildClient(format).instance.defaults.paramsSerializer,
      ).toBe('function');
    }
  });

  it('brackets: ids[]=1&ids[]=2&ids[]=3', () => {
    const client = buildClient('brackets');
    const fn = client.instance.defaults.paramsSerializer as (
      params: unknown,
    ) => string;
    expect(fn({ ids: [1, 2, 3] })).toBe('ids%5B%5D=1&ids%5B%5D=2&ids%5B%5D=3');
  });

  it('comma: ids=1,2,3', () => {
    const client = buildClient('comma');
    const fn = client.instance.defaults.paramsSerializer as (
      params: unknown,
    ) => string;
    expect(fn({ ids: [1, 2, 3] })).toBe('ids=1%2C2%2C3');
  });

  it('indices: ids[0]=1&ids[1]=2&ids[2]=3', () => {
    const client = buildClient('indices');
    const fn = client.instance.defaults.paramsSerializer as (
      params: unknown,
    ) => string;
    expect(fn({ ids: [1, 2, 3] })).toBe(
      'ids%5B0%5D=1&ids%5B1%5D=2&ids%5B2%5D=3',
    );
  });

  it('repeat: ids=1&ids=2&ids=3', () => {
    const client = buildClient('repeat');
    const fn = client.instance.defaults.paramsSerializer as (
      params: unknown,
    ) => string;
    expect(fn({ ids: [1, 2, 3] })).toBe('ids=1&ids=2&ids=3');
  });

  it('request 级 paramsSerializer 覆盖也走 qs（单请求）', async () => {
    const requestMock = new MockAdapter(axios);
    let query = '';
    const client = new RequestClient({ responseReturn: 'body' });
    requestMock.onGet(/\/list/).reply((config) => {
      // axios 已把序列化结果并入 url（MockAdapter 不展开）——用 buildFullPath 断言：
      query = axios.getUri({
        params: config.params,
        paramsSerializer: config.paramsSerializer,
      });
      return [200, {}];
    });
    await client.get('/list', {
      params: { ids: [1, 2] },
      paramsSerializer: 'repeat',
    });
    expect(query).toContain('ids=1');
    expect(query).toContain('ids=2');
    requestMock.restore();
  });
});
