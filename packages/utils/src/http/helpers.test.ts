import { describe, expect, it } from 'vitest';

import {
  bindMethods,
  isFunction,
  isString,
  isUndefined,
  merge,
} from './helpers';

// 对齐 @vben/utils（defu 语义）的行为契约，关键点：
// merge(userConfig, defaultConfig) —— 用户配置优先、默认配置补缺；
// 数组与非纯对象整体取前参；返回新对象不改入参。

describe('helpers: merge（defu 语义）', () => {
  it('用户配置优先，默认配置补缺', () => {
    const merged = merge(
      { timeout: 60_000, baseURL: '/api' },
      { timeout: 10_000, responseReturn: 'raw' },
    );
    expect(merged).toEqual({
      timeout: 60_000,
      baseURL: '/api',
      responseReturn: 'raw',
    });
  });

  it('深合并嵌套对象（用户叶子优先）', () => {
    const merged = merge(
      { headers: { 'X-A': '1' } },
      { headers: { 'X-A': 'default', 'X-B': '2' } },
    );
    expect(merged).toEqual({ headers: { 'X-A': '1', 'X-B': '2' } });
  });

  it('数组与非纯对象整体取前参（不展开合并）', () => {
    const date = new Date(0);
    const merged = merge(
      { list: [1, 2], at: date },
      { list: [3], at: new Date(1) },
    );
    expect(merged.list).toEqual([1, 2]);
    expect(merged.at).toBe(date);
  });

  it('显式 null 覆盖默认值（key in result 即不补缺）', () => {
    const merged = merge({ token: null as unknown as string }, { token: 'x' });
    expect(merged.token).toBeNull();
  });

  it('入参不被修改、返回新对象', () => {
    const user = { a: 1 };
    const def = { b: 2 };
    const merged = merge(user, def);
    expect(merged).toEqual({ a: 1, b: 2 });
    expect(user).toEqual({ a: 1 });
    expect(def).toEqual({ b: 2 });
    expect(merged).not.toBe(user);
  });

  it('多个 defaults 依次补缺', () => {
    const merged = merge({ a: 1 }, { a: 9, b: 2 }, { b: 8, c: 3 });
    expect(merged).toEqual({ a: 1, b: 2, c: 3 });
  });
});

describe('helpers: inference', () => {
  it('isUndefined / isString / isFunction', () => {
    expect(isUndefined(undefined)).toBe(true);
    expect(isUndefined(null)).toBe(false);
    expect(isString('x')).toBe(true);
    expect(isString(1)).toBe(false);
    expect(isFunction(() => {})).toBe(true);
    expect(isFunction({})).toBe(false);
  });
});

describe('helpers: bindMethods', () => {
  it('解构方法后 this 仍指向实例', () => {
    class Client {
      value = 42;
      getValue() {
        return this.value;
      }
    }
    const client = new Client();
    bindMethods(client);
    const { getValue } = client;
    expect(getValue()).toBe(42);
  });

  it('跳过 constructor 与 getter/setter', () => {
    class Client {
      private inner = 7;
      get doubled() {
        return this.inner * 2;
      }
      setDoubled() {
        return this.doubled;
      }
    }
    const client = new Client();
    bindMethods(client);
    // getter 不应被 bind 成自身属性（保持原型访问器）
    const descriptor = Object.getOwnPropertyDescriptor(client, 'doubled');
    expect(descriptor).toBeUndefined();
    expect(client.doubled).toBe(14);
    expect((client as { setDoubled: () => number }).setDoubled()).toBe(14);
  });
});
