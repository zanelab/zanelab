import { usePreferencesStore } from '@/stores/preferences-store';

type BuiltinThemeType =
  | 'custom'
  | 'default'
  | 'deep-blue'
  | 'deep-green'
  | 'gray'
  | 'green'
  | 'neutral'
  | 'orange'
  | 'pink'
  | 'rose'
  | 'sky-blue'
  | 'slate'
  | 'violet'
  | 'yellow'
  | 'zinc';

interface ColorPreset {
  color: string;
  type: BuiltinThemeType;
}

/** 等价于 上游 preferences 包 COLOR_PRESETS（BUILT_IN_THEME_PRESETS 前 7 项） */
const COLOR_PRESETS: ColorPreset[] = [
  { color: 'hsl(212 100% 45%)', type: 'default' },
  { color: 'hsl(245 82% 67%)', type: 'violet' },
  { color: 'hsl(347 77% 60%)', type: 'pink' },
  { color: 'hsl(42 84% 61%)', type: 'yellow' },
  { color: 'hsl(231 98% 65%)', type: 'sky-blue' },
  { color: 'hsl(161 90% 43%)', type: 'green' },
  { color: 'hsl(240 5% 26%)', type: 'zinc' },
];

/** SVG: palette */
const PaletteIcon = () => (
  <svg
    className="size-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="13.5" cy="6.5" r="1.5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r="1.5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r="1.5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r="1.5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.5-4.5-10-10-10z" />
  </svg>
);

/** SVG: checkmark for active preset */
const CheckIcon = () => (
  <svg className="size-3.5" viewBox="0 0 15 15" fill="currentColor">
    <path
      clipRule="evenodd"
      d="M11.467 3.727c.289.189.37.576.181.865l-4.25 6.5a.625.625 0 0 1-.944.12l-2.75-2.5a.625.625 0 0 1 .841-.925l2.208 2.007l3.849-5.886a.625.625 0 0 1 .865-.181"
      fillRule="evenodd"
    />
  </svg>
);

/**
 * ColorToggle — 1:1 port of widgets/color-toggle.vue.
 * hover 展开预设主题色（同时更新 colorPrimary 与 builtinType，激活态按 builtinType 判定）。
 */
export function ColorToggle() {
  const builtinType = usePreferencesStore((s) => s.theme.builtinType);
  const updatePreferences = usePreferencesStore((s) => s.updatePreferences);

  const handleUpdate = (colorPrimary: string, type: BuiltinThemeType) => {
    updatePreferences({
      theme: {
        colorPrimary,
        builtinType: type,
      },
    });
  };

  return (
    <div className="group relative flex items-center overflow-hidden">
      <div className="flex w-0 overflow-hidden transition-all duration-500 ease-out group-hover:w-60">
        {COLOR_PRESETS.map((preset) => (
          <button
            key={preset.color}
            type="button"
            className="btn btn-ghost btn-sm btn-square shrink-0"
            onClick={() => handleUpdate(preset.color, preset.type)}
          >
            <div
              className="flex-center relative size-5 rounded-full transition-transform hover:scale-110"
              style={{ backgroundColor: preset.color }}
            >
              {builtinType === preset.type ? (
                <span className="text-white">
                  <CheckIcon />
                </span>
              ) : null}
            </div>
          </button>
        ))}
      </div>

      <button type="button" className="btn btn-ghost btn-sm btn-square">
        <span className="text-primary">
          <PaletteIcon />
        </span>
      </button>
    </div>
  );
}
