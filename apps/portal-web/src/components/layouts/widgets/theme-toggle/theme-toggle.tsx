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
  shouldOnHover?: boolean;

  className?: string;
}

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
                onClick={(e) => switchThemeMode(item.name, e)}
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
