import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './zh-CN.json';
import enUS from './en-US.json';
import { appConfig } from '../config';
import {
  usePreferencesStore,
  hasUserChosenLocale,
  USER_LOCALE_KEY,
} from '../stores/preferences-store';
import { normalizeLocale, toLegacyLocale } from '@zanelab/utils';
import type { MenuItem } from '../types';

function resolveInitialLocale(): string {
  const persisted = usePreferencesStore.getState().app.locale;
  const appGroup = appConfig.preferences?.app as
    { locale?: unknown } | undefined;
  const fromConfig = normalizeLocale(appGroup?.locale);
  if (fromConfig && !hasUserChosenLocale()) {
    return fromConfig;
  }
  return persisted;
}

void i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    'en-US': { translation: enUS },
  },
  lng: resolveInitialLocale(),
  fallbackLng: 'zh-CN',
  interpolation: { escapeValue: false },
});

const loadedPacks = new Set<string>();

export async function loadMessagePack(lng: string): Promise<void> {
  const url = appConfig.i18n.packUrls[lng];
  if (!url || loadedPacks.has(lng)) return;
  loadedPacks.add(lng);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const pack = await res.json();
    i18n.addResourceBundle(lng, 'translation', pack, true, true);

    if (i18n.language === lng) i18n.emit('languageChanged', lng);
  } catch (e) {
    console.error('[i18n] 语言包加载失败，降级内置文案：', url, e);
  }
}

export function __resetLoadedPacksForTest() {
  loadedPacks.clear();
}

void loadMessagePack(usePreferencesStore.getState().app.locale);

document.documentElement.lang = i18n.language ?? 'zh-CN';

const LOCALE_KEY = 'zanelab-locale';

export function syncLocale(locale: string): void {
  try {
    window.localStorage.setItem(LOCALE_KEY, toLegacyLocale(locale));
  } catch {}
}

export function switchLocale(locale: string): void {
  syncLocale(locale);

  try {
    window.localStorage.setItem(USER_LOCALE_KEY, toLegacyLocale(locale));
  } catch {}
  usePreferencesStore.getState().updatePreferences({ app: { locale } });
  window.location.reload();
}

syncLocale(i18n.language ?? 'zh-CN');

usePreferencesStore.subscribe((state, prev) => {
  const locale = state.app.locale;
  if (locale === prev.app.locale) return;
  syncLocale(locale);
  void loadMessagePack(locale);
  void i18n.changeLanguage(locale);
  document.documentElement.lang = locale;
});

export function systemName(): string {
  const { name, nameEn } = appConfig.system;
  const isZh = (i18n.language ?? 'zh-CN').toLowerCase().startsWith('zh');
  return isZh ? name : nameEn || name;
}

export function menuTitle(menu: Pick<MenuItem, 'name' | 'i18nKey'>): string {
  return menu.i18nKey
    ? i18n.t(menu.i18nKey, { defaultValue: menu.name })
    : menu.name;
}

export default i18n;
