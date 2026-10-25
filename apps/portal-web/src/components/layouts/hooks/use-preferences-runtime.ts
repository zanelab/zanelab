import { useEffect } from 'react';
import { usePreferencesStore } from '../../../stores/preferences-store';
import { generatorColorVariables } from '@zanelab/utils';

/**
 * usePreferencesRuntime — React 等价实现 of reference
 * packages/@core/preferences/src/preferences.ts 的 setupWatcher（:412-436）与
 * update-css-variables.ts 的 updateCSSVariables / updateColorMode。
 *
 * Reference 由 PreferenceManager 在 init 时挂 watcher、在每次更新时同步
 * CSS 变量与颜色模式类；React port 改为渲染期 effect 订阅 store 派生值，
 * 值变化时写入 DOM —— 语义一致（zustand persist 重放初始化亦会触发）。
 *
 * 覆盖项：
 * - app.isMobile：matchMedia('(max-width: 767.98px)') 断点监听
 *   （等价 useBreakpoints(breakpointsTailwind).smaller('md')，immediate: true）
 * - --radius / --font-size-base / --menu-font-size CSS 变量（theme.radius/fontSize）
 * - html invert-mode / grayscale-mode 类（updateColorMode，
 *   preferences.ts:453-459）；data-theme=builtinType 有意省略（见下方注释）
 * - 主题色 CSS 变量（--primary 等，参考 updateMainColorVariables —— port 的
 *   主题色走 daisyUI token 覆盖，见 index.css --color-* 映射，故仅同步
 *   色板 token 变量本身）
 */
export function usePreferencesRuntime() {
  const radius = usePreferencesStore((s) => s.theme.radius);
  const fontSize = usePreferencesStore((s) => s.theme.fontSize);
  const colorPrimary = usePreferencesStore((s) => s.theme.colorPrimary);
  const colorDestructive = usePreferencesStore((s) => s.theme.colorDestructive);
  const colorSuccess = usePreferencesStore((s) => s.theme.colorSuccess);
  const colorWarning = usePreferencesStore((s) => s.theme.colorWarning);
  const colorWeakMode = usePreferencesStore((s) => s.app.colorWeakMode);
  const colorGrayMode = usePreferencesStore((s) => s.app.colorGrayMode);
  const updatePreferences = usePreferencesStore((s) => s.updatePreferences);

  // setupWatcher —— isMobile 断点监听（breakpointsTailwind md=768px，
  // smaller('md') 即 <768px → max-width: 767.98px 与 Tailwind [—md] 一致）
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767.98px)');
    const handler = (e: MediaQueryList | MediaQueryListEvent) => {
      updatePreferences({ app: { isMobile: e.matches } });
    };
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [updatePreferences]);

  // updateCSSVariables —— --radius / --font-size-base / --menu-font-size
  // daisyUI 组件圆角不消费 --radius（那是 Tailwind rounded-* 的源），
  // 而是各用 --radius-field / --radius-selector / --radius-box（daisyUI
  // 主题块静态定义）——须一并同步，否则按钮/输入框等看不到圆角设置效果。
  // 映射保持 daisyUI 默认档比例：field = radius/2，selector/box = radius。
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--radius', `${radius}rem`);
    root.style.setProperty('--radius-field', `${Number(radius) / 2}rem`);
    root.style.setProperty('--radius-selector', `${radius}rem`);
    root.style.setProperty('--radius-box', `${radius}rem`);
    root.style.setProperty('--font-size-base', `${fontSize}px`);
    root.style.setProperty('--menu-font-size', `calc(${fontSize}px * 0.875)`);
  }, [radius, fontSize]);

  // data-theme = builtinType（update-css-variables.ts:29-35）—— React port
  // 有意省略：daisyUI 5 以 data-theme=[light|dark] 作为主题 token 的功能
  // 选择器（theme-provider 写入），reference 的 data-theme=builtinType 仅为
  // 装饰性选择器（本 port 的 .light[data-theme='default'] 等规则与 .light
  // 完全重复，无视觉效果）；若在此覆写会使 daisyUI 主题匹配失效。

  // updateMainColorVariables —— 1:1（update-css-variables.ts:88-119）：
  // generatorColorVariables 生成 50-950 阶 ramp（--primary-* / --green-* /
  // --yellow-* / --red-* 及 --success/--warning/--destructive 主值），随后
  // 将 -500 阶映射到语义主变量（--success/--primary/--destructive/--warning）。
  // 各变量为 HSL 三元组格式 —— index.css 的 --primary 等以 hsl(var(--primary))
  // 消费（经 convertToHslCssVar 转换）
  useEffect(() => {
    const root = document.documentElement;
    if (!colorPrimary && !colorDestructive && !colorSuccess && !colorWarning) {
      return;
    }
    const colorVariables = generatorColorVariables([
      { color: colorPrimary, name: 'primary' },
      { alias: 'warning', color: colorWarning, name: 'yellow' },
      { alias: 'success', color: colorSuccess, name: 'green' },
      { alias: 'destructive', color: colorDestructive, name: 'red' },
    ]);

    // 要设置的 CSS 变量映射（update-css-variables.ts:103-108）
    const colorMappings: Record<string, string> = {
      '--green-500': '--success',
      '--primary-500': '--primary',
      '--red-500': '--destructive',
      '--yellow-500': '--warning',
    };
    for (const [sourceVar, targetVar] of Object.entries(colorMappings)) {
      const colorValue = colorVariables[sourceVar];
      if (colorValue) {
        root.style.setProperty(targetVar, colorValue);
      }
    }

    // 其余 ramp 变量（--primary-50…950 等，reference executeUpdateCSSVariables）
    for (const [key, value] of Object.entries(colorVariables)) {
      if (!(key in colorMappings)) {
        root.style.setProperty(key, value);
      }
    }
  }, [colorPrimary, colorDestructive, colorSuccess, colorWarning]);

  // updateColorMode —— invert-mode / grayscale-mode
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('invert-mode', colorWeakMode);
    root.classList.toggle('grayscale-mode', colorGrayMode);
  }, [colorWeakMode, colorGrayMode]);
}
