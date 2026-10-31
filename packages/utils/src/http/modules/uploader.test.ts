import type { RequestClient } from '../request-client';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FileUploader } from './uploader';

// vben uploader.test.ts 等价移植：mock client，断言 FormData 组装与
// multipart Content-Type 合并（config.headers 覆盖默认值）。
describe('fileUploader', () => {
  let fileUploader: FileUploader;
  const mockClient = {
    post: vi.fn(),
  } as unknown as RequestClient & { post: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    fileUploader = new FileUploader(mockClient);
  });

  it('file 进 FormData，Content-Type 默认 multipart/form-data', async () => {
    mockClient.post.mockResolvedValueOnce({ ok: true });
    const file = new File(['file content'], 'test.txt', {
      type: 'text/plain',
    });

    const result = await fileUploader.upload('/upload', { file });
    expect(result).toEqual({ ok: true });

    const [, formData, config] = mockClient.post.mock.calls[0] as [
      string,
      FormData,
      { headers: Record<string, string> },
    ];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get('file')).toBe(file);
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
  });

  it('自定义 headers 与默认 multipart 头合并（用户值优先）', async () => {
    mockClient.post.mockResolvedValueOnce({ ok: true });
    const file = new File(['x'], 'a.txt');

    await fileUploader.upload(
      '/upload',
      { file },
      {
        headers: { 'Custom-Header': 'value' },
      },
    );
    const [, , config] = mockClient.post.mock.calls[0] as [
      string,
      FormData,
      { headers: Record<string, string> },
    ];
    expect(config.headers).toEqual({
      'Content-Type': 'multipart/form-data',
      'Custom-Header': 'value',
    });
  });

  it('数组字段按下标 append（ids[0]/ids[1]），undefined 值跳过', async () => {
    mockClient.post.mockResolvedValueOnce({ ok: true });
    const file = new File(['x'], 'a.txt');
    await fileUploader.upload('/upload', {
      file,
      ids: ['a', 'b'],
      remark: undefined,
    });
    const [, formData] = mockClient.post.mock.calls[0] as [string, FormData];
    expect(formData.get('ids[0]')).toBe('a');
    expect(formData.get('ids[1]')).toBe('b');
    expect(formData.has('remark')).toBe(false);
  });
});
