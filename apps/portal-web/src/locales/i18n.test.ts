import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { appConfig } from '../config';
import i18n, {
  __resetLoadedPacksForTest,
  loadMessagePack,
  menuTitle,
} from './i18n';
import { usePreferencesStore } from '../stores/preferences-store';

beforeEach(async () => {
  usePreferencesStore.setState((s) => ({ app: { ...s.app, locale: 'zh-CN' } }));
  await i18n.changeLanguage('zh-CN');
});

describe('menuTitle 兜底语义（三态）', () => {
  it('无 i18nKey → 原样返回接口原文 name', () => {
    expect(menuTitle({ name: '首页' })).toBe('首页');
  });

  it('有 i18nKey 但语言包缺条目 → 回退 name（defaultValue）', () => {
    expect(menuTitle({ name: '兜底原文', i18nKey: 'menus.not.exists' })).toBe(
      '兜底原文',
    );
  });

  it('有 i18nKey 且命中 → 取语言包翻译（两种语言断言）', async () => {
    expect(menuTitle({ name: '首页', i18nKey: 'menus.home' })).toBe('首页');
    expect(menuTitle({ name: '系统管理', i18nKey: 'menus.system.title' })).toBe(
      '系统管理',
    );

    await i18n.changeLanguage('en-US');
    expect(menuTitle({ name: '首页', i18nKey: 'menus.home' })).toBe('Home');
    expect(menuTitle({ name: '系统管理', i18nKey: 'menus.system.title' })).toBe(
      'System',
    );
  });
});

describe('语言包懒加载（loadMessagePack / config.i18n.packUrls）', () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    __resetLoadedPacksForTest();
    errorSpy.mockClear();
  });

  it('未配置 URL → no-op，menuTitle 回退 name', async () => {
    await expect(loadMessagePack('zh-CN')).resolves.toBeUndefined();
    expect(menuTitle({ name: '原文', i18nKey: 'menus.lazy.custom' })).toBe(
      '原文',
    );
  });

  it('加载成功 → 新增 key 兜底 + 同名覆盖内置 + 同级不受影响', async () => {
    appConfig.i18n.packUrls['zh-CN'] = '/i18n/test-pack-zh.json';
    server.use(
      http.get('/i18n/test-pack-zh.json', () =>
        HttpResponse.json({
          menus: { lazy: { custom: '懒加载文案' }, home: '覆盖的首页' },
        }),
      ),
    );
    await loadMessagePack('zh-CN');
    expect(menuTitle({ name: '原文', i18nKey: 'menus.lazy.custom' })).toBe(
      '懒加载文案',
    );
    expect(menuTitle({ name: '首页', i18nKey: 'menus.home' })).toBe(
      '覆盖的首页',
    );
    expect(menuTitle({ name: '系统管理', i18nKey: 'menus.system.title' })).toBe(
      '系统管理',
    );
    delete appConfig.i18n.packUrls['zh-CN'];
  });

  it('加载失败（404）→ 不抛异常，降级内置文案', async () => {
    appConfig.i18n.packUrls['zh-CN'] = '/i18n/missing-pack.json';
    server.use(
      http.get(
        '/i18n/missing-pack.json',
        () => new HttpResponse(null, { status: 404 }),
      ),
    );
    await expect(loadMessagePack('zh-CN')).resolves.toBeUndefined();
    expect(menuTitle({ name: '原文', i18nKey: 'menus.missing.key' })).toBe(
      '原文',
    );
    expect(errorSpy).toHaveBeenCalledTimes(1);
    delete appConfig.i18n.packUrls['zh-CN'];
  });

  it('幂等：同语言重复调用只请求一次', async () => {
    let fetched = 0;
    appConfig.i18n.packUrls['zh-CN'] = '/i18n/once-pack.json';
    server.use(
      http.get('/i18n/once-pack.json', () => {
        fetched += 1;
        return HttpResponse.json({ menus: { lazy: { once: '一次' } } });
      }),
    );
    await Promise.all([loadMessagePack('zh-CN'), loadMessagePack('zh-CN')]);
    await loadMessagePack('zh-CN');
    expect(fetched).toBe(1);
    delete appConfig.i18n.packUrls['zh-CN'];
  });

  it('切语言链路：切到配置了 packUrl 的语言 → 自动加载并生效', async () => {
    appConfig.i18n.packUrls['en-US'] = '/i18n/test-pack-en.json';
    server.use(
      http.get('/i18n/test-pack-en.json', () =>
        HttpResponse.json({ menus: { lazy: { custom: 'Lazy-loaded text' } } }),
      ),
    );
    usePreferencesStore
      .getState()
      .updatePreferences({ app: { locale: 'en-US' } });
    await vi.waitFor(() =>
      expect(menuTitle({ name: '原文', i18nKey: 'menus.lazy.custom' })).toBe(
        'Lazy-loaded text',
      ),
    );
    expect(i18n.language).toBe('en-US');
    delete appConfig.i18n.packUrls['en-US'];
  });
});

describe('切语言链路（preferences 单点订阅）', () => {
  it('preferences.app.locale 变更 → changeLanguage + <html lang> 同步', async () => {
    usePreferencesStore
      .getState()
      .updatePreferences({ app: { locale: 'en-US' } });
    await vi.waitFor(() => expect(i18n.language).toBe('en-US'));
    expect(document.documentElement.lang).toBe('en-US');

    usePreferencesStore
      .getState()
      .updatePreferences({ app: { locale: 'zh-CN' } });
    await vi.waitFor(() => expect(i18n.language).toBe('zh-CN'));
    expect(document.documentElement.lang).toBe('zh-CN');
  });

  it('locale 未变的偏好更新不触发 changeLanguage', () => {
    usePreferencesStore
      .getState()
      .updatePreferences({ app: { name: '改名不改语言' } });
    expect(i18n.language).toBe('zh-CN');
    expect(document.documentElement.lang).toBe('zh-CN');
  });
});
