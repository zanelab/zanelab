import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TinyColor } from '@ctrl/tinycolor';

import { convertToHsl } from '@zanelab/utils';
import { AppIcon } from '../../../../../icons/app-icon';

/** 等价 reference BuiltinThemePreset（@core/preferences constants.ts:3-7） */
interface BuiltinThemePreset {
  color: string;
  darkPrimaryColor?: string;
  primaryColor?: string;
  type: string;
}

/** BUILT_IN_THEME_PRESETS —— 1:1（constants.ts:10-107，含顺序） */
const BUILTIN_THEME_PRESETS: BuiltinThemePreset[] = [
  { color: 'hsl(212 100% 45%)', type: 'default' },
  { color: 'hsl(245 82% 67%)', type: 'violet' },
  { color: 'hsl(347 77% 60%)', type: 'pink' },
  { color: 'hsl(42 84% 61%)', type: 'yellow' },
  { color: 'hsl(231 98% 65%)', type: 'sky-blue' },
  { color: 'hsl(161 90% 43%)', type: 'green' },
  {
    color: 'hsl(240 5% 26%)',
    darkPrimaryColor: 'hsl(0 0% 98%)',
    primaryColor: 'hsl(240 5.9% 10%)',
    type: 'zinc',
  },
  { color: 'hsl(181 84% 32%)', type: 'deep-green' },
  { color: 'hsl(211 91% 39%)', type: 'deep-blue' },
  { color: 'hsl(18 89% 40%)', type: 'orange' },
  { color: 'hsl(0 75% 42%)', type: 'rose' },
  {
    color: 'hsl(0 0% 25%)',
    darkPrimaryColor: 'hsl(0 0% 98%)',
    primaryColor: 'hsl(240 5.9% 10%)',
    type: 'neutral',
  },
  {
    color: 'hsl(215 25% 27%)',
    darkPrimaryColor: 'hsl(0 0% 98%)',
    primaryColor: 'hsl(240 5.9% 10%)',
    type: 'slate',
  },
  {
    color: 'hsl(217 19% 27%)',
    darkPrimaryColor: 'hsl(0 0% 98%)',
    primaryColor: 'hsl(240 5.9% 10%)',
    type: 'gray',
  },
  { color: '', type: 'custom' },
];

/** user-round-pen（自定义主题色；原 strokeWidth 1.5，收拢统一为 2 —— 已拍板） */
const UserRoundPenIcon = () => (
  <AppIcon name="user-round-pen" className="size-5" />
);

interface BuiltinThemeProps {
  value: string;
  onChange: (value: string) => void;
  themeColorPrimary: string;
  onThemeColorPrimaryChange: (value: string) => void;
  isDark?: boolean;
}

/**
 * BuiltinTheme — 1:1 port of preferences/blocks/theme/builtin.vue.
 * 预设选择 / isDark 变化时，由预设的 primaryColor（暗色下 darkPrimaryColor）
 * 同步 themeColorPrimary（等价 reference watch([modelValue, isDark])，
 * builtin.vue:104-118）；自定义色输入为 <input type="color">，输出经
 * convertToHsl 归一为 hsl() 字符串（等价 reference 的转换链）。
 */
export function BuiltinTheme({
  value,
  onChange,
  themeColorPrimary,
  onThemeColorPrimaryChange,
  isDark = false,
}: BuiltinThemeProps) {
  const { t } = useTranslation();
  const colorInputRef = useRef<HTMLInputElement>(null);

  const isMountedRef = useRef(false);

  // reference 的 watch 非 immediate —— 首次挂载不触发（保留已持久化的
  // 自定义 colorPrimary），仅 modelValue / isDark 变化时派生
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    const theme = BUILTIN_THEME_PRESETS.find((item) => item.type === value);
    if (theme) {
      const primaryColor = isDark
        ? theme.darkPrimaryColor || theme.primaryColor
        : theme.primaryColor;
      if (primaryColor || theme.color) {
        onThemeColorPrimaryChange(primaryColor || theme.color);
      }
    }
    // watch([modelValue, isDark]) —— 选中预设 / 暗色切换时同步主色
  }, [value, isDark, onThemeColorPrimaryChange]);

  function handleSelect(theme: BuiltinThemePreset) {
    if (theme.type === 'custom') return;
    // reference handleSelect 仅写 modelValue（builtin.vue:85-87）—— 主色
    // 派生完全由上面的 watch（effect）承担
    onChange(theme.type);
  }

  // input[type=color] 产出 #hex —— convertToHsl 归一（builtin.vue:81 等价）。
  // reference 经 useThrottleFn(fn, 300, true, true)（leading + trailing），
  // trailing 定时器按窗口起点锚定（throttleFilter 的
  // setTimeout(..., duration - elapsed)）—— 持续拖拽时每 ~300ms 落一次
  // 实时更新，而非拖拽结束后才写
  function handleColorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = convertToHsl(e.target.value);
    // leading：窗口起点 —— 立即写入，并记录窗口起点
    if (throttleTimer.current === null) {
      onThemeColorPrimaryChange(value);
      windowStart.current = Date.now();
      throttleTimer.current = setTimeout(() => {
        throttleTimer.current = null;
      }, 300);
      return;
    }

    // trailing：按剩余窗口时间调度（duration - elapsed），窗口内的后续
    // 事件仅更新待写入值
    trailingValue.current = value;
    if (pendingTrailing.current) {
      return;
    }
    pendingTrailing.current = true;
    const elapsed = Date.now() - windowStart.current;
    const remaining = Math.max(0, 300 - elapsed);
    clearTimeout(throttleTimer.current);
    throttleTimer.current = setTimeout(() => {
      throttleTimer.current = null;
      pendingTrailing.current = false;
      if (trailingValue.current !== null) {
        onThemeColorPrimaryChange(trailingValue.current);
        trailingValue.current = null;

        // trailing 写入即新窗口起点（throttleFilter 的 lastExec 更新）
        windowStart.current = Date.now();
      }
    }, remaining);
  }

  const throttleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const windowStart = useRef(0);
  const pendingTrailing = useRef(false);
  const trailingValue = useRef<string | null>(null);

  // 卸载时清理未触发的节流定时器
  useEffect(
    () => () => {
      if (throttleTimer.current !== null) clearTimeout(throttleTimer.current);
    },
    [],
  );

  /** hsl()/任意格式 → #rrggbb（input[type=color] 要求，经 TinyColor 转换） */
  function toHexColor(color: string): string {
    const c = new TinyColor(color);
    return c.isValid ? c.toHexString() : '#000000';
  }

  return (
    <div className="flex w-full flex-wrap justify-between">
      {BUILTIN_THEME_PRESETS.map((theme) => {
        const isActive = theme.type === value;
        return (
          <div
            key={theme.type}
            className="flex cursor-pointer flex-col"
            onClick={() => handleSelect(theme)}
          >
            <div
              className={`group outline-box flex-center cursor-pointer ${
                isActive ? 'outline-box-active' : ''
              }`}
            >
              {theme.type !== 'custom' ? (
                <div
                  className="mx-9 my-2 size-5 rounded-md"
                  style={{ backgroundColor: theme.color }}
                />
              ) : (
                <div
                  className="size-full px-9 py-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    colorInputRef.current?.click();
                  }}
                >
                  <div className="relative flex size-5 items-center justify-center rounded-sm">
                    <div className="absolute z-1 opacity-60 group-hover:opacity-100">
                      <UserRoundPenIcon />
                    </div>
                    <input
                      ref={colorInputRef}
                      type="color"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      value={toHexColor(themeColorPrimary)}
                      onChange={handleColorChange}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="text-base-content/60 my-2 text-center text-xs">
              {t(
                `preferences.theme.builtinNames.${LABEL_KEYS[theme.type] ?? 'custom'}`,
                { defaultValue: theme.type },
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 主题标识 → 语言包 key 后缀（文案渲染期经 t 解析，未命中回退标识本身） */
const LABEL_KEYS: Record<string, string> = {
  default: 'default',
  violet: 'violet',
  pink: 'pink',
  yellow: 'yellow',
  'sky-blue': 'skyBlue',
  green: 'green',
  zinc: 'zinc',
  'deep-green': 'deepGreen',
  'deep-blue': 'deepBlue',
  orange: 'orange',
  rose: 'rose',
  neutral: 'neutral',
  slate: 'slate',
  gray: 'gray',
  custom: 'custom',
};
