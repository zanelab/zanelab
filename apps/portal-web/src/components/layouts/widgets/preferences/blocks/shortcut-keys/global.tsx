import { useTranslation } from 'react-i18next';
import { SwitchItem } from '../switch-item';

interface GlobalShortcutKeysProps {
  shortcutKeysEnable: boolean;
  onShortcutKeysEnableChange: (v: boolean) => void;
  shortcutKeysGlobalSearch: boolean;
  onShortcutKeysGlobalSearchChange: (v: boolean) => void;
  shortcutKeysGlobalLockScreen: boolean;
  onShortcutKeysGlobalLockScreenChange: (v: boolean) => void;
  shortcutKeysGlobalLogout: boolean;
  onShortcutKeysGlobalLogoutChange: (v: boolean) => void;
}

export function GlobalShortcutKeys({
  shortcutKeysEnable,
  onShortcutKeysEnableChange,
  shortcutKeysGlobalSearch,
  onShortcutKeysGlobalSearchChange,
  shortcutKeysGlobalLockScreen,
  onShortcutKeysGlobalLockScreenChange,
  shortcutKeysGlobalLogout,
  onShortcutKeysGlobalLogoutChange,
}: GlobalShortcutKeysProps) {
  const { t } = useTranslation();
  const modKey =
    typeof navigator !== 'undefined' && navigator.platform.includes('Win')
      ? 'Ctrl'
      : '⌘';
  const altKey =
    typeof navigator !== 'undefined' && navigator.platform.includes('Win')
      ? 'Alt'
      : '⌥';

  return (
    <div>
      <SwitchItem
        value={shortcutKeysEnable}
        onChange={onShortcutKeysEnableChange}
      >
        {t('preferences.shortcutKeys.enable')}
      </SwitchItem>
      <SwitchItem
        value={shortcutKeysGlobalSearch}
        onChange={onShortcutKeysGlobalSearchChange}
        disabled={!shortcutKeysEnable}
        shortcut={`${modKey} K`}
      >
        {t('preferences.shortcutKeys.globalSearch')}
      </SwitchItem>
      <SwitchItem
        value={shortcutKeysGlobalLockScreen}
        onChange={onShortcutKeysGlobalLockScreenChange}
        disabled={!shortcutKeysEnable}
        shortcut={`${altKey} L`}
      >
        {t('preferences.shortcutKeys.lockScreen')}
      </SwitchItem>
      <SwitchItem
        value={shortcutKeysGlobalLogout}
        onChange={onShortcutKeysGlobalLogoutChange}
        disabled={!shortcutKeysEnable}
        shortcut={`${altKey} Q`}
      >
        {t('preferences.shortcutKeys.logout')}
      </SwitchItem>
    </div>
  );
}
