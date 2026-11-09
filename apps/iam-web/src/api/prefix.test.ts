/*
 * api/prefix.ts 单测（任务 11-08 S1：显式 props.apiPrefix 参数化）。
 *
 * 三分支锁死（dev 行为不变的回归护栏）：
 * - 显式 apiPrefix 存在（typeof 'string'）→ 去尾斜杠返回；**空串不被 ?? 吞掉**
 *   （部署直连的落点：宿主实例端点已含完整路径，前缀必须是 ''）
 * - 未传 → basename 派生（dev 集成态 = activeRule '/iam'）
 * - 都没有 → ''（独立态直落本 dev server）
 */
import { afterEach, describe, expect, it } from 'vitest';
import { setProps, type PltProps } from '../props';
import {
  apiPrefix as resolveApiPrefixFromStore,
  resolveApiPrefix,
} from './prefix';

afterEach(() => {
  // 模块级 props store 复位：防止串进后续用例/测试文件
  setProps({});
});

describe('resolveApiPrefix（纯函数，四分支）', () => {
  it('显式 apiPrefix 为空串 → 返回空串（不被 ?? 吞掉，部署直连落点）', () => {
    expect(resolveApiPrefix({ apiPrefix: '', basename: '/iam' })).toBe('');
  });

  it("显式 apiPrefix '/foo/' → 去尾斜杠返回 '/foo'", () => {
    expect(resolveApiPrefix({ apiPrefix: '/foo/' })).toBe('/foo');
  });

  it("未传 apiPrefix、basename='/iam' → 回退 basename 派生 '/iam'", () => {
    expect(resolveApiPrefix({ basename: '/iam' })).toBe('/iam');
  });

  it('未传 apiPrefix、无 basename → 空串（独立态直落本 dev server）', () => {
    expect(resolveApiPrefix({})).toBe('');
  });

  it("basename 带尾斜杠（独立 render 传 '/'）→ 同样去尾斜杠为空", () => {
    expect(resolveApiPrefix({ basename: '/' })).toBe('');
  });

  it('显式 apiPrefix 非字符串脏值（宿主 props 类型层不可信）→ 视同未传回退 basename', () => {
    expect(
      resolveApiPrefix({
        apiPrefix: null,
        basename: '/iam',
      } as unknown as PltProps),
    ).toBe('/iam');
  });
});

describe('apiPrefix()（模块级 store 形态，setProps 驱动）', () => {
  it("读最新 props：部署 config.js 传 apiPrefix: '' 时前缀为空", () => {
    setProps({ apiPrefix: '', basename: '/iam' });
    expect(resolveApiPrefixFromStore()).toBe('');
  });

  it('dev 宿主不传 apiPrefix：回退 basename（与改动前行为一致）', () => {
    setProps({ basename: '/iam' });
    expect(resolveApiPrefixFromStore()).toBe('/iam');
  });

  it('独立态（props 恒空对象）→ 空串', () => {
    setProps({});
    expect(resolveApiPrefixFromStore()).toBe('');
  });
});
