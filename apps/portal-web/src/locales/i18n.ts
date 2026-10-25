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

// i18n 运行时（09-09-i18n design §1/§2）：
// - 两语言包全量打包（体量小，不做懒加载）；namespace 单一（translation），
//   key 按业务段嵌套（common/session/auth/preferences/demo/pages/widgets/menus），
//   与后端下发的菜单 i18nKey 点串（如 menus.system.users）直接对应。
// - 初始语言：本地用户选择优先，其次 config.js preferences.app.locale（部署期默认）。
// - main.tsx 在 React 渲染前副作用 import 本模块。

// ── 初始语言解析 ─────────────────────────────────────────────────────────────

/**
 * 初始语言：本地已保存的用户选择优先；用户从未选过时用 config.js
 * `preferences.app.locale` 作为部署期默认值（默认简体中文）。
 *
 * config 值经 normalizeLocale 归一化：`zh_CN` / `en_US`（下划线）与
 * `zh-CN` / `en-US` 都认，非支持语言忽略。
 *
 * 为什么这里直接读 config：i18n 在 main.tsx 合并 config 偏好之前初始化，
 * 只看 store 会先以默认中文起，再切到配置语言 → 首屏闪烁。语言在 store 里
 * 的最终合并规则见 applyConfigPreferences（用户选择过则 config 不覆盖）。
 */
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
  interpolation: { escapeValue: false }, // React 已防注入
});

// ── 运行时语言包懒加载（config.js i18n.packUrls）──────────────────────────
// 第三方菜单的 i18nKey 可能不在内置语言包里；语言包通常较大，config 只放 URL，
// 切换到对应语言时才按需 fetch，深合并进 translation 命名空间（新增 key 兜住
// 缺失的菜单标题，同名 key 覆盖内置文案）。与 iconPackUrl 同思路。
const loadedPacks = new Set<string>();

/**
 * 懒加载某语言的语言包：未配置 URL 或已加载过 → no-op（幂等）。
 * fetch 失败静默降级内置文案（console.error；不重试，避免切语言时反复打失败请求）。
 */
export async function loadMessagePack(lng: string): Promise<void> {
  const url = appConfig.i18n.packUrls[lng];
  if (!url || loadedPacks.has(lng)) return;
  loadedPacks.add(lng); // 先标记再请求，并发调用（启动预载 + 立即切换）只 fetch 一次
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const pack = await res.json();
    i18n.addResourceBundle(lng, 'translation', pack, true, true);

    // react-i18next 默认只订阅 languageChanged（bindI18nStore 默认空串），
    // store 'added' 不会触发重渲染——对当前语言补发一次，让 menuTitle 等
    // t() 直调的消费点（渲染期经 App 的 useTranslation 订阅重算）取到新文案。
    if (i18n.language === lng) i18n.emit('languageChanged', lng);
  } catch (e) {
    console.error('[i18n] 语言包加载失败，降级内置文案：', url, e);
  }
}

/** 测试复位用：清空已加载语言包记录（生产代码勿调用）。 */
export function __resetLoadedPacksForTest() {
  loadedPacks.clear();
}

// 启动时预载当前语言的语言包（异步不阻塞渲染；加载完成后补发事件驱动补渲染）
void loadMessagePack(usePreferencesStore.getState().app.locale);

// <html lang> 与初始 locale 对齐
document.documentElement.lang = i18n.language ?? 'zh-CN';

// ── 旧项目 / 子应用语言约定（localStorage + x-lang）────────────────────────────

/** 旧项目与子应用读取语言的裸 localStorage key（旧 umi plugin-locale 直读该键）。 */
const LOCALE_KEY = 'zanelab-locale';

/**
 * 同步语言到 localStorage：宿主是语言的唯一来源，启动与切换时都写入
 * （转旧格式下划线），保证已挂载/后加载的子应用读到的语言与宿主一致。
 * localStorage 不可用（隐私模式等）时静默忽略，不影响壳内 i18n。
 */
export function syncLocale(locale: string): void {
  try {
    window.localStorage.setItem(LOCALE_KEY, toLegacyLocale(locale));
  } catch {}
}

/**
 * 父应用切换语言：写 localStorage → 更新偏好（下方订阅里 changeLanguage）
 * → **整页刷新**（对齐旧项目 umi setLocale(lang, realReload = true)）。
 *
 * 为什么刷新而不是就地切换：后端按请求头 x-lang、子应用按 localStorage key
 * 取语言，只切宿主运行时会导致已挂载子应用停留在旧语言、按语言下发的
 * 菜单等数据也不会重拉。刷新后启动链路会带上新语言。
 */
export function switchLocale(locale: string): void {
  syncLocale(locale);

  // 打「用户显式选择过语言」标记：config.js 的 preferences.app.locale 之后
  // 只作默认值，不再覆盖用户选择（见 applyConfigPreferences）
  try {
    window.localStorage.setItem(USER_LOCALE_KEY, toLegacyLocale(locale));
  } catch {}
  usePreferencesStore.getState().updatePreferences({ app: { locale } });
  window.location.reload();
}

// 启动即同步一次（与当前语言对齐）
syncLocale(i18n.language ?? 'zh-CN');

// 切语言链路（design §2）：单点订阅 preferences-store —— locale 变更 →
// changeLanguage + <html lang> 同步。收敛在这一个订阅点，组件不各自监听。
// 用户侧切换走 switchLocale()（额外写 localStorage + 整页刷新，对齐旧项目）；
// 此处订阅同时兜住「直接改偏好」的路径（如偏好设置面板）。
usePreferencesStore.subscribe((state, prev) => {
  const locale = state.app.locale;
  if (locale === prev.app.locale) return;
  syncLocale(locale); // 任何路径的语言变更都保持 localStorage 与宿主一致
  void loadMessagePack(locale); // 目标语言的语言包未加载过则按需拉取（加载后补发事件补渲染）
  void i18n.changeLanguage(locale);
  document.documentElement.lang = locale;
});

/**
 * 系统名（按当前语言解析）：英文取 config.js `system.nameEn`，未配则回落 `system.name`。
 *
 * 登录页标题/版权/偏好设置占位等「语言相关的系统名」展示点统一经此函数。
 * 注意 index.html 的首屏 <title> 另有一份等效的静态实现（i18n 尚未加载，拿不到这里）。
 */
export function systemName(): string {
  const { name, nameEn } = appConfig.system;
  const isZh = (i18n.language ?? 'zh-CN').toLowerCase().startsWith('zh');
  return isZh ? name : nameEn || name;
}

/**
 * 菜单标题统一解析（design §4）：i18nKey 命中语言包条目取翻译，
 * 否则（未配 key / 包缺条目）回退接口原文 name。
 * 侧边栏/顶栏/搜索/tabbar/面包屑/用户下拉框的标题消费点统一经此函数；
 * 菜单 store 仍存全量原始契约（i18nKey 随 name 一起存），翻译在渲染期解析。
 */
export function menuTitle(menu: Pick<MenuItem, 'name' | 'i18nKey'>): string {
  return menu.i18nKey
    ? i18n.t(menu.i18nKey, { defaultValue: menu.name })
    : menu.name;
}

export default i18n;
