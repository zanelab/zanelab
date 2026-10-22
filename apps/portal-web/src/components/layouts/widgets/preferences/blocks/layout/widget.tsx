import { useTranslation } from 'react-i18next';
import { SelectItem } from '../select-item';
import { SwitchItem } from '../switch-item';

interface WidgetProps {
  widgetGlobalSearch: boolean;
  onWidgetGlobalSearchChange: (v: boolean) => void;
  widgetFullscreen: boolean;
  onWidgetFullscreenChange: (v: boolean) => void;
  widgetLanguageToggle: boolean;
  onWidgetLanguageToggleChange: (v: boolean) => void;
  widgetNotification: boolean;
  onWidgetNotificationChange: (v: boolean) => void;
  widgetThemeToggle: boolean;
  onWidgetThemeToggleChange: (v: boolean) => void;
  widgetSidebarToggle: boolean;
  onWidgetSidebarToggleChange: (v: boolean) => void;
  widgetLockScreen: boolean;
  onWidgetLockScreenChange: (v: boolean) => void;
  widgetRefresh: boolean;
  onWidgetRefreshChange: (v: boolean) => void;
  widgetTimezone: boolean;
  onWidgetTimezoneChange: (v: boolean) => void;
  appPreferencesButtonPosition: string;
  onAppPreferencesButtonPositionChange: (v: string) => void;
}

export function Widget({
  widgetGlobalSearch,
  onWidgetGlobalSearchChange,
  widgetFullscreen,
  onWidgetFullscreenChange,
  widgetLanguageToggle,
  onWidgetLanguageToggleChange,
  widgetNotification,
  onWidgetNotificationChange,
  widgetThemeToggle,
  onWidgetThemeToggleChange,
  widgetSidebarToggle,
  onWidgetSidebarToggleChange,
  widgetLockScreen,
  onWidgetLockScreenChange,
  widgetRefresh,
  onWidgetRefreshChange,
  widgetTimezone,
  onWidgetTimezoneChange,
  appPreferencesButtonPosition,
  onAppPreferencesButtonPositionChange,
}: WidgetProps) {
  const { t } = useTranslation();
  return (
    <div>
      <SwitchItem
        value={widgetGlobalSearch}
        onChange={onWidgetGlobalSearchChange}
      >
        {t('preferences.widget.globalSearch')}
      </SwitchItem>
      <SwitchItem value={widgetFullscreen} onChange={onWidgetFullscreenChange}>
        {t('preferences.widget.fullscreen')}
      </SwitchItem>
      <SwitchItem
        value={widgetLanguageToggle}
        onChange={onWidgetLanguageToggleChange}
      >
        {t('preferences.widget.languageToggle')}
      </SwitchItem>
      <SwitchItem
        value={widgetNotification}
        onChange={onWidgetNotificationChange}
      >
        {t('preferences.widget.notification')}
      </SwitchItem>
      <SwitchItem
        value={widgetThemeToggle}
        onChange={onWidgetThemeToggleChange}
      >
        {t('preferences.widget.themeToggle')}
      </SwitchItem>
      <SwitchItem
        value={widgetSidebarToggle}
        onChange={onWidgetSidebarToggleChange}
      >
        {t('preferences.widget.sidebarToggle')}
      </SwitchItem>
      <SwitchItem value={widgetLockScreen} onChange={onWidgetLockScreenChange}>
        {t('preferences.widget.lockScreen')}
      </SwitchItem>
      <SwitchItem value={widgetRefresh} onChange={onWidgetRefreshChange}>
        {t('preferences.widget.refresh')}
      </SwitchItem>
      <SwitchItem value={widgetTimezone} onChange={onWidgetTimezoneChange}>
        {t('preferences.widget.timezone')}
      </SwitchItem>
      <SelectItem
        value={appPreferencesButtonPosition}
        onChange={onAppPreferencesButtonPositionChange}
        items={[
          { label: t('preferences.widget.positions.auto'), value: 'auto' },
          { label: t('preferences.widget.positions.header'), value: 'header' },
          { label: t('preferences.widget.positions.fixed'), value: 'fixed' },
          {
            label: t('preferences.widget.positions.userDropdown'),
            value: 'user-dropdown',
          },
        ]}
      >
        {t('preferences.widget.buttonPosition')}
      </SelectItem>
    </div>
  );
}
