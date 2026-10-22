import { afterEach, describe, expect, it } from 'vitest';
import {
  applyConfigPreferences,
  usePreferencesStore,
  hasUserChosenLocale,
  USER_LOCALE_KEY,
  defaultPreferences,
} from './preferences-store';

afterEach(() => {
  window.localStorage.removeItem(USER_LOCALE_KEY);
  usePreferencesStore.setState({ app: { ...defaultPreferences.app } });
});

describe('applyConfigPreferences 语言默认值语义', () => {
  it('用户未切过语言 → config 的 app.locale 生效', () => {
    window.localStorage.removeItem(USER_LOCALE_KEY);
    usePreferencesStore.setState({
      app: { ...defaultPreferences.app, locale: 'zh-CN' },
    });
    expect(hasUserChosenLocale()).toBe(false);

    applyConfigPreferences({ app: { locale: 'en-US' } });
    expect(usePreferencesStore.getState().app.locale).toBe('en-US');
  });

  it('用户切过语言 → config 不覆盖（切语言不会被压回）', () => {
    window.localStorage.setItem(USER_LOCALE_KEY, 'en_US');
    usePreferencesStore.setState({
      app: { ...defaultPreferences.app, locale: 'en-US' },
    });
    expect(hasUserChosenLocale()).toBe(true);

    applyConfigPreferences({ app: { locale: 'zh-CN' } });
    expect(usePreferencesStore.getState().app.locale).toBe('en-US');
  });

  it('config 用下划线写法（en_US）→ 归一化为 en-US 入库', () => {
    window.localStorage.removeItem(USER_LOCALE_KEY);
    usePreferencesStore.setState({
      app: { ...defaultPreferences.app, locale: 'zh-CN' },
    });

    applyConfigPreferences({ app: { locale: 'en_US' } });
    expect(usePreferencesStore.getState().app.locale).toBe('en-US');
  });

  it('config 配了不支持的语言 → 忽略，保持现值', () => {
    window.localStorage.removeItem(USER_LOCALE_KEY);
    usePreferencesStore.setState({
      app: { ...defaultPreferences.app, locale: 'zh-CN' },
    });

    applyConfigPreferences({ app: { locale: 'ja-JP' } });
    expect(usePreferencesStore.getState().app.locale).toBe('zh-CN');
  });

  it('config 未配 locale → 保持现值；其它分组照常覆盖', () => {
    window.localStorage.removeItem(USER_LOCALE_KEY);
    usePreferencesStore.setState({
      app: { ...defaultPreferences.app, locale: 'en-US' },
    });

    applyConfigPreferences({ app: { compact: true } });
    expect(usePreferencesStore.getState().app.locale).toBe('en-US');
    expect(usePreferencesStore.getState().app.compact).toBe(true);
  });
});

describe('setSidebarCollapsed 幂等（防 React #185 死循环）', () => {
  it('同值重复调用不产生新的 state 对象（不触发订阅者重渲染）', () => {
    usePreferencesStore.setState({
      sidebar: { ...usePreferencesStore.getState().sidebar, collapsed: false },
    });

    const before = usePreferencesStore.getState();

    usePreferencesStore.getState().setSidebarCollapsed(false);
    expect(usePreferencesStore.getState()).toBe(before);

    usePreferencesStore.getState().setSidebarCollapsed(false);
    expect(usePreferencesStore.getState()).toBe(before);
  });

  it('值变化时正常写入并通知', () => {
    usePreferencesStore.setState({
      sidebar: { ...usePreferencesStore.getState().sidebar, collapsed: false },
    });

    const seen: boolean[] = [];
    const off = usePreferencesStore.subscribe((s) =>
      seen.push(s.sidebar.collapsed),
    );

    usePreferencesStore.getState().setSidebarCollapsed(true);
    expect(usePreferencesStore.getState().sidebar.collapsed).toBe(true);
    expect(seen).toEqual([true]);

    usePreferencesStore.getState().setSidebarCollapsed(true);
    expect(seen).toEqual([true]);

    off();
    usePreferencesStore.setState({
      sidebar: { ...usePreferencesStore.getState().sidebar, collapsed: false },
    });
  });
});
