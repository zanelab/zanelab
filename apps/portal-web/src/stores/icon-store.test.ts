import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useIconStore } from './icon-store';
import type { IconData } from '@zanelab/types';

const A: IconData = { paths: ['M0 0'] };
const A2: IconData = { viewBox: '0 0 48 48', paths: ['M1 1'] };
const B: IconData = { paths: ['M2 2'] };

beforeEach(() => {
  useIconStore.setState({ icons: {} });
});

describe('useIconStore.registerIcons', () => {
  it('注册新键', () => {
    useIconStore.getState().registerIcons({ a: A });
    expect(useIconStore.getState().icons).toEqual({ a: A });
  });

  it('多次注册浅合并：新键加入、同键覆盖、存量键保留', () => {
    useIconStore.getState().registerIcons({ a: A, b: B });
    useIconStore.getState().registerIcons({ a: A2 });
    expect(useIconStore.getState().icons).toEqual({ a: A2, b: B });
  });

  it('非法条目被 zod 拒绝跳过、合法条目照常注册（畸形数据不进注册表）', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    useIconStore.getState().registerIcons({
      bad: { paths: 'M0 0' } as unknown as IconData,
      noPaths: {} as unknown as IconData,
      ok: A,
    });
    expect(useIconStore.getState().icons).toEqual({ ok: A });
    expect(warnSpy).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });

  it('window.__registerIcons 汇入同一 store', () => {
    window.__registerIcons!({ b: B });
    expect(useIconStore.getState().icons).toEqual({ b: B });
  });
});
