import { useLayoutStore } from '../../../../stores/layout-store';
import { switchThemeMode } from '../../../../utils/theme-transition';

interface ThemeButtonProps {
  modelValue?: boolean;

  type?: 'icon' | 'normal';
}

export function ThemeButton({
  modelValue: isDark,
  type = 'normal',
}: ThemeButtonProps) {
  const storeIsDark = useLayoutStore((s) => s.isDark);
  const dark = isDark ?? storeIsDark;

  const theme = dark ? 'light' : 'dark';

  return (
    <button
      type="button"
      aria-label={theme}
      aria-live="polite"
      className={[
        'theme-toggle cursor-pointer border-none bg-none hover:animate-[shrink_0.3s_ease-in-out]',
        `is-${theme}`,
        type === 'icon'
          ? 'btn btn-ghost btn-sm btn-circle rounded-full'
          : 'btn btn-ghost btn-sm',
      ].join(' ')}
      style={type === 'icon' ? { padding: '7px' } : undefined}
      onClick={(e) => {
        e.stopPropagation();
        switchThemeMode(theme, e);
      }}
    >
      <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24">
        <mask id="theme-toggle-moon" className="theme-toggle__moon">
          <rect fill="white" height="100%" width="100%" x="0" y="0" />
          <circle cx="40" cy="8" fill="black" r="11" />
        </mask>
        <circle
          id="sun"
          className="theme-toggle__sun fill-foreground/90"
          cx="12"
          cy="12"
          mask="url(#theme-toggle-moon)"
          r="11"
          fill="currentColor"
          opacity="0.9"
          stroke="none"
          style={{ transformOrigin: 'center center' }}
        />
        <g
          className="theme-toggle__sun-beams stroke-foreground/90 stroke-2"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.9"
          style={{ transformOrigin: 'center center' }}
        >
          <line x1="12" x2="12" y1="1" y2="3" />
          <line x1="12" x2="12" y1="21" y2="23" />
          <line x1="4.22" x2="5.64" y1="4.22" y2="5.64" />
          <line x1="18.36" x2="19.78" y1="18.36" y2="19.78" />
          <line x1="1" x2="3" y1="12" y2="12" />
          <line x1="21" x2="23" y1="12" y2="12" />
          <line x1="4.22" x2="5.64" y1="19.78" y2="18.36" />
          <line x1="18.36" x2="19.78" y1="5.64" y2="4.22" />
        </g>
      </svg>

      <style>{`
        .theme-toggle .theme-toggle__moon > circle {
          transition: transform 0.5s cubic-bezier(0, 0, 0.3, 1);
        }
        .theme-toggle .theme-toggle__sun {
          transition: transform 1.6s cubic-bezier(0.25, 0, 0.2, 1);
        }
        .theme-toggle .theme-toggle__sun-beams {
          transition:
            transform 1.6s cubic-bezier(0.5, 1.5, 0.75, 1.25),
            opacity 0.6s cubic-bezier(0.25, 0, 0.3, 1);
        }
        .theme-toggle.is-light .theme-toggle__sun {
          transform: scale(0.5);
        }
        .theme-toggle.is-light .theme-toggle__sun-beams {
          transform: rotateZ(0.25turn);
        }
        .theme-toggle.is-dark .theme-toggle__moon > circle {
          transform: translateX(-20px);
        }
        .theme-toggle.is-dark .theme-toggle__sun-beams {
          opacity: 0;
        }
        .theme-toggle:hover > svg .theme-toggle__sun {
          fill: currentColor;
        }
        .theme-toggle:hover > svg .theme-toggle__sun-beams {
          stroke: currentColor;
        }
      `}</style>
    </button>
  );
}
