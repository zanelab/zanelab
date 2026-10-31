import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, loadConfig, mergeConfig } from './index';
import type { AppConfig } from '@zanelab/types';

describe('loadConfig', () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    window.__APP_CONFIG__ = undefined;
    errorSpy.mockClear();
  });
  afterEach(() => {
    delete window.__APP_CONFIG__;
  });

  it('无 window.__APP_CONFIG__ 时返回默认配置的副本', () => {
    const cfg = loadConfig();
    expect(cfg).toEqual(DEFAULT_CONFIG);
    expect(cfg).not.toBe(DEFAULT_CONFIG);
  });

  it('部分配置与默认深合并：缺省键保留默认、覆盖键生效', () => {
    window.__APP_CONFIG__ = {
      system: { name: '测试平台' },
      layout: { theme: 'light' },
      api: { baseURL: '/api' },
    };
    const cfg = loadConfig();
    expect(cfg.system.name).toBe('测试平台');
    expect(cfg.system.logo).toBe(DEFAULT_CONFIG.system.logo);
    expect(cfg.layout.theme).toBe('light');
    expect(cfg.layout.layout).toBe(DEFAULT_CONFIG.layout.layout);
    expect(cfg.auth.loginPage.layout).toBe(
      DEFAULT_CONFIG.auth.loginPage.layout,
    );
    expect(cfg.api.baseURL).toBe('/api');
    expect(cfg.api.menusEndpoint).toBe(DEFAULT_CONFIG.api.menusEndpoint);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('整值替换而非拼接：system.logo 覆盖为整值后不再带默认前缀', () => {
    window.__APP_CONFIG__ = {
      system: { name: 'A' },
      api: { baseURL: '/gateway' },
    };
    expect(loadConfig().api.baseURL).toBe('/gateway');
  });

  it('配置非法（theme 枚举外）→ console.error 并回退默认配置（不抛异常）', () => {
    window.__APP_CONFIG__ = { layout: { theme: 'purple' } };
    let cfg!: AppConfig;
    expect(() => {
      cfg = loadConfig();
    }).not.toThrow();
    expect(cfg).toEqual(DEFAULT_CONFIG);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('配置非法（类型错误）→ 回退默认', () => {
    window.__APP_CONFIG__ = { route: { homePath: 42 } };
    expect(loadConfig()).toEqual(DEFAULT_CONFIG);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('i18n.packUrls 合法 → 透传（语言包懒加载 URL）', () => {
    window.__APP_CONFIG__ = {
      i18n: { packUrls: { 'zh-CN': '/i18n/zh-CN.json' } },
    };
    expect(loadConfig().i18n.packUrls).toEqual({ 'zh-CN': '/i18n/zh-CN.json' });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('i18n.packUrls 非法（值非字符串）→ 回退默认', () => {
    window.__APP_CONFIG__ = { i18n: { packUrls: { 'zh-CN': 42 } } };
    expect(loadConfig()).toEqual(DEFAULT_CONFIG);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  // 部署兼容契约（design DD4 / F7），非普通字段删除：线上已部署的 config.js 可能仍带
  // 已移除的 api.useMock 键。AppConfigSchema 是普通 z.object（非 strict），未知键被 strip
  // 而非报错 —— 故旧配置仍能加载，不会触发「校验失败 → 回退 DEFAULT_CONFIG」的兜底路径，
  // 也就不会让线上菜单/子应用注册凭空清空。本用例锁住该行为，防止将来有人把 schema 改成
  // .strict() 时静默破坏已部署的配置。
  it('残留已移除的 api.useMock 键 → 不报错、不回退，且返回值上无该键', () => {
    window.__APP_CONFIG__ = { api: { useMock: true } };
    const cfg = loadConfig();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(cfg.api).not.toHaveProperty('useMock');
    // 余下键仍是默认值（证明确实走了 strip 而非回退：回退也会得到 DEFAULT_CONFIG，
    // 故上面 errorSpy 的断言才是这条契约的判别条件）
    expect(cfg).toEqual(DEFAULT_CONFIG);
  });
});

describe('mergeConfig', () => {
  it('深合并：嵌套对象逐层合并，标量整值替换', () => {
    const result = mergeConfig(
      { a: { x: 1, y: 2 }, list: [1, 2], n: 1 },
      { a: { x: 9 }, list: [3], n: 2 },
    );
    expect(result).toEqual({ a: { x: 9, y: 2 }, list: [3], n: 2 });
  });

  it('数组按整值替换（不做成员级合并）', () => {
    const result = mergeConfig({ list: [1, 2] }, { list: [1, 2, 3] });
    expect(result.list).toEqual([1, 2, 3]);
  });
});
