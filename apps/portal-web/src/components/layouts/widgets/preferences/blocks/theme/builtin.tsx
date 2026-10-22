import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TinyColor } from '@ctrl/tinycolor';

import { convertToHsl } from '@zanelab/utils';
import { AppIcon } from '../../../../../icons/app-icon';

interface BuiltinThemePreset {
  color: string;
  darkPrimaryColor?: string;
  primaryColor?: string;
  type: string;
}

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
  }, [value, isDark, onThemeColorPrimaryChange]);

  function handleSelect(theme: BuiltinThemePreset) {
    if (theme.type === 'custom') return;
    onChange(theme.type);
  }

  function handleColorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = convertToHsl(e.target.value);
    if (throttleTimer.current === null) {
      onThemeColorPrimaryChange(value);
      windowStart.current = Date.now();
      throttleTimer.current = setTimeout(() => {
        throttleTimer.current = null;
      }, 300);
      return;
    }

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

        windowStart.current = Date.now();
      }
    }, remaining);
  }

  const throttleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const windowStart = useRef(0);
  const pendingTrailing = useRef(false);
  const trailingValue = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (throttleTimer.current !== null) clearTimeout(throttleTimer.current);
    },
    [],
  );

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
