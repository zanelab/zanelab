import { useState } from 'react';
import { usePreferencesStore } from '../../../../stores/preferences-store';
import { useLayoutStore } from '../../../../stores/layout-store';
import { switchThemeMode } from '../../../../utils/theme-transition';
import { AppIcon } from '../../../icons/app-icon';
import { ThemeButton } from './theme-button';

type ThemeMode = 'auto' | 'dark' | 'light';

const PRESETS: Array<{
  icon: React.ReactNode;
  name: ThemeMode;
  title: string;
}> = [
  {
    icon: <AppIcon name="sun" className="size-5" />,
    name: 'light',
    title: '浅色',
  },
  {
    icon: <AppIcon name="moon-star" className="size-5" />,
    name: 'dark',
    title: '深色',
  },
  {
    icon: <AppIcon name="sun-moon" className="size-5" />,
    name: 'auto',
    title: '跟随系统',
  },
];

interface ThemeToggleProps {
  /** 悬停时以 tooltip 展示三个模式选项 */
  shouldOnHover?: boolean;

  /** 根元素 class（等价参考实现 的 Vue class 透传，header 传 mt-0.5 mr-1） */
  className?: string;
}

/**
 * ThemeToggle — 1:1 port of widgets/theme-toggle/theme-toggle.vue.
 * ThemeButton（点击在 light/dark 间切换）+ hover tooltip 三选一（light/dark/auto）。
 */
export function ThemeToggle({
  shouldOnHover = false,
  className = '',
}: ThemeToggleProps) {
  const preferences = usePreferencesStore();
  const isDark = useLayoutStore((s) => s.isDark);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => {
        if (shouldOnHover) setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
    >
      <ThemeButton type="icon" modelValue={isDark} />
      {shouldOnHover && hovered ? (
        <div
          className="tooltip absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2"
          role="tooltip"
        >
          <div className="border-base-300 bg-base-100 flex gap-2 rounded-lg border p-1 shadow-lg">
            {PRESETS.map((item) => (
              <button
                key={item.name}
                type="button"
                title={item.title}
                className={[
                  'border-base-300 flex h-8 w-8 items-center justify-center rounded-md border transition-colors',
                  preferences.theme.mode === item.name
                    ? 'bg-primary/10 text-primary border-primary/40'
                    : 'text-base-content/70 hover:bg-base-200',
                ].join(' ')}
                onClick={(e) =>
                  // 统一走 switchThemeMode（radial View Transition）——此前此处
                  // 直接写 store 硬切无过渡（与 ThemeButton 点击路径不一致）
                  switchThemeMode(item.name, e)
                }
              >
                {item.icon}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
