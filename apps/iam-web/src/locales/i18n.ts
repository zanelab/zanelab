import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './zh-CN.json';
import enUS from './en-US.json';
import { normalizeLocale } from '@zanelab/utils';

/*
 * iam 子应用 i18n 运行时（与 apps/portal-web/src/locales 同一模块形状的轻量子集）：
 *
 * - 语言包全量打包（两语言，体量小）；namespace 单一（translation），key 按业务段
 *   嵌套（iam.login / iam.otp），与登录页/验证弹窗文案一一对应。
 * - **语言来源 = 基座下发的 props**（iam 无本地语言偏好，基座是语言的唯一真相源）：
 *   1. 初始语言：mount 时 props.preferences.locale（SubAppPreferences 契约内）；
 *      未下发（独立运行/基座未升级）时缺省 zh-CN。
 *   2. 运行期变更：PltProps.onHostStateChange 订阅（register.ts §9.4——快照含
 *      preferences 外观子集，locale 变更会推送），main.tsx setup 时接线到
 *      setLocale()。getter 语义下子应用每次 mount 也读最新值，双路兜底。
 * - 与宿主 i18n 隔离：宿主与子应用各自持独立 i18next 实例（qiankun JS 沙箱下
 *   模块副本独立），互不干扰；bundle 内文案自包含，不依赖宿主语言包。
 * - normalizeLocale 复用 @zanelab/utils（zh_CN/en_US 下划线旧格式与横线格式都认），
 *   与宿主 config/preferences 的归一化规则一致。
 */

/** 支持的语言（与宿主两语言包对齐）；基座下发的 locale 归一化后命中才采用。 */
const SUPPORTED = ['zh-CN', 'en-US'] as const;

export type IamLocale = (typeof SUPPORTED)[number];

const FALLBACK: IamLocale = 'zh-CN';

/**
 * 归一化基座下发的 locale：支持格式内的语言返回；未下发/非支持语言 → null
 * （调用方决定缺省——init 时用 zh-CN，订阅回调里忽略无效值）。
 */
export function resolveIamLocale(locale?: string): IamLocale | null {
  const normalized = normalizeLocale(locale);
  return (SUPPORTED as readonly string[]).includes(normalized ?? '')
    ? (normalized as IamLocale)
    : null;
}

function initI18n(initial?: string) {
  void i18n.use(initReactI18next).init({
    resources: {
      'zh-CN': { translation: zhCN },
      'en-US': { translation: enUS },
    },
    lng: resolveIamLocale(initial) ?? FALLBACK,
    fallbackLng: FALLBACK,
    interpolation: { escapeValue: false }, // React 已防注入
  });
  document.documentElement.lang = i18n.language;
}

/** React 渲染前副作用调用（main.tsx mount/独立运行两入口统一）——初始语言取基座 props。 */
export function setupI18n(propsLocale?: string) {
  if (i18n.isInitialized) {
    // qiankun update/mount 复挂载：isInitialized 已 true，只对齐语言（不重复 init
    // ——i18next 二次 init 会丢 resources 订阅），语言以最新 props 为准。
    setLocale(propsLocale);
    return;
  }
  initI18n(propsLocale);
}

/** 语言切换（基座 onHostStateChange 推送 / mount 复挂载对齐的唯一入口）。 */
export function setLocale(locale?: string) {
  const next = resolveIamLocale(locale);
  if (!next || i18n.language === next) return;
  void i18n.changeLanguage(next);
  document.documentElement.lang = next;
}

export default i18n;
