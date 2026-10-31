import type { RequestClient } from '../request-client';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FileDownloader } from './downloader';

// vben downloader.test.ts 等价移植：mock client，断言 download 的
// 默认配置合并（responseReturn:'body' + responseType:'blob'）与方法分发。
describe('fileDownloader', () => {
  let fileDownloader: FileDownloader;
  const mockRequest = vi.fn();
  const mockGet = vi.fn();
  const mockPost = vi.fn();
  const mockClient = {
    request: mockRequest,
    get: mockGet,
    post: mockPost,
  } as unknown as RequestClient;

  beforeEach(() => {
    vi.clearAllMocks();
    fileDownloader = new FileDownloader(mockClient);
  });

  it('默认走 client.request，配置含 responseReturn body + responseType blob', async () => {
    const blob = new Blob(['file content'], { type: 'text/plain' });
    mockRequest.mockResolvedValueOnce(blob);

    const result = await fileDownloader.download('/file');
    expect(result).toBe(blob);
    expect(mockRequest).toHaveBeenCalledWith('/file', {
      responseReturn: 'body',
      method: 'GET',
      responseType: 'blob',
    });
  });

  it('自定义 config 与默认值合并（用户值优先）', async () => {
    mockRequest.mockResolvedValueOnce(new Blob(['x']));
    await fileDownloader.download('/file', {
      headers: { 'Custom-Header': 'value' },
      method: 'GET',
    });
    expect(mockRequest).toHaveBeenCalledWith('/file', {
      responseReturn: 'body',
      method: 'GET',
      responseType: 'blob',
      headers: { 'Custom-Header': 'value' },
    });
  });

  it('method POST → client.post 分发（data 拆参）', async () => {
    // request 不存在（undefined）→ 走方法分发分支
    const postOnlyClient = {
      request: undefined,
      post: vi.fn(),
    } as unknown as RequestClient & { post: ReturnType<typeof vi.fn> };
    const downloader = new FileDownloader(postOnlyClient);
    postOnlyClient.post.mockResolvedValueOnce(new Blob(['x']));
    await downloader.download('/export', {
      method: 'POST',
      data: { year: 2026 },
    });
    expect(postOnlyClient.post).toHaveBeenCalledWith(
      '/export',
      { year: 2026 },
      { responseReturn: 'body', method: 'POST', responseType: 'blob' },
    );
  });

  it('底层错误原样上抛', async () => {
    mockRequest.mockRejectedValueOnce(new Error('Network Error'));
    await expect(fileDownloader.download('/file')).rejects.toThrow(
      'Network Error',
    );
  });
});
