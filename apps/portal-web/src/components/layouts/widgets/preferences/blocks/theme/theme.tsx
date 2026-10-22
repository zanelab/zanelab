import { useTranslation } from 'react-i18next';
import { AppIcon } from '../../../../../icons/app-icon';
import { SwitchItem } from '../switch-item';

const SunIcon = () => <AppIcon name="sun" className="mx-9 size-5" />;

const MoonIcon = () => <AppIcon name="moon" className="mx-9 size-5" />;

const SystemIcon = () => <AppIcon name="sun" className="mx-9 size-5" />;

const THEME_PRESET = [
  { icon: SunIcon, name: 'light' as const },
  { icon: MoonIcon, name: 'dark' as const },
  { icon: SystemIcon, name: 'auto' as const },
];

interface ThemeProps {
  value: string;
  onChange: (value: string) => void;
  currentLayout?: string;
  themeSemiDarkSidebar: boolean;
  onThemeSemiDarkSidebarChange: (v: boolean) => void;
  themeSemiDarkSidebarSub: boolean;
  onThemeSemiDarkSidebarSubChange: (v: boolean) => void;
  themeSemiDarkHeader: boolean;
  onThemeSemiDarkHeaderChange: (v: boolean) => void;
}

export function Theme({
  value,
  onChange,
  currentLayout = 'sidebar-nav',
  themeSemiDarkSidebar,
  onThemeSemiDarkSidebarChange,
  themeSemiDarkSidebarSub,
  onThemeSemiDarkSidebarSubChange,
  themeSemiDarkHeader,
  onThemeSemiDarkHeaderChange,
}: ThemeProps) {
  const { t } = useTranslation();
  const isDark = value === 'dark';
  const isHeaderNav = currentLayout === 'header-nav';
  const isFullContent = currentLayout === 'full-content';
  const isMixedLayout =
    currentLayout === 'header-mixed-nav' ||
    currentLayout === 'sidebar-mixed-nav';

  return (
    <div className="flex w-full flex-wrap justify-between">
      {THEME_PRESET.map((theme) => (
        <div
          key={theme.name}
          className="flex cursor-pointer flex-col"
          onClick={() => onChange(theme.name)}
        >
          <div
            className={`outline-box flex-center py-4 ${
              value === theme.name ? 'outline-box-active' : ''
            }`}
          >
            <theme.icon />
          </div>
          <div className="text-base-content/60 mt-2 text-center text-xs">
            {t(`preferences.theme.${theme.name}`)}
          </div>
        </div>
      ))}

      <div className="mt-6 w-full">
        <SwitchItem
          value={themeSemiDarkSidebar}
          onChange={onThemeSemiDarkSidebarChange}
          disabled={isDark || isHeaderNav || isFullContent}
          tip={t('preferences.theme.semiDarkSidebarTip')}
        >
          {t('preferences.theme.semiDarkSidebar')}
        </SwitchItem>
      </div>
      <SwitchItem
        value={themeSemiDarkSidebarSub}
        onChange={onThemeSemiDarkSidebarSubChange}
        disabled={isDark || !isMixedLayout || !themeSemiDarkSidebar}
        tip={t('preferences.theme.semiDarkSubTip')}
      >
        {t('preferences.theme.semiDarkSub')}
      </SwitchItem>
      <SwitchItem
        value={themeSemiDarkHeader}
        onChange={onThemeSemiDarkHeaderChange}
        disabled={isDark}
      >
        {t('preferences.theme.semiDarkHeader')}
      </SwitchItem>
    </div>
  );
}
