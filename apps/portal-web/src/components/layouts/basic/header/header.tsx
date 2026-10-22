import { Fragment, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { usePreferencesStore } from '../../../../stores/preferences-store';
import { useTabbarStore } from '../../../../stores/tabbar-store';
import { usePreferencesButtonPosition } from '../../hooks/use-preferences';
import { AppIcon } from '../../../icons/app-icon';
import { GlobalSearch } from '../../widgets/global-search/global-search';
import { LanguageToggle } from '../../widgets/language-toggle';
import { Notification } from '../../widgets/notification/notification';
import { PreferencesButton } from '../../widgets/preferences/preferences-button';
import { ThemeToggle } from '../../widgets/theme-toggle/theme-toggle';
import { TimezoneButton } from '../../widgets/timezone/timezone-button';
import type { MenuRecordRaw } from '@zanelab/types';

interface LayoutHeaderProps {
  theme?: string;

  slotBreadcrumb?: ReactNode;

  slotMenu?: ReactNode;

  slotGlobalSearch?: ReactNode;
  slotPreferences?: ReactNode;
  slotThemeToggle?: ReactNode;
  slotLanguageToggle?: ReactNode;
  slotTimezone?: ReactNode;
  slotFullscreen?: ReactNode;
  slotNotification?: ReactNode;
  slotUserDropdown?: ReactNode;
  slotRefresh?: ReactNode;

  leftExtra?: ReactNode;

  leftExtraIndex?: number;

  rightExtra?: ReactNode;

  rightExtraIndex?: number;

  menus?: MenuRecordRaw[];

  onClearPreferencesAndLogout?: () => void;
}

type SlotItem = { index: number; name: string };

export const REFERENCE_VALUE = 100;

function FullScreenButton() {
  const { t } = useTranslation();
  const [isFullscreen, setIsFullscreen] = useState(
    !!document.fullscreenElement,
  );

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  function toggle() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm btn-square mr-1"
      title={
        isFullscreen
          ? t('widgets.header.exitFullscreen')
          : t('widgets.header.fullscreen')
      }
      onClick={toggle}
    >
      {isFullscreen ? (
        <AppIcon name="minimize" className="size-4" />
      ) : (
        <AppIcon name="maximize" className="size-4" />
      )}
    </button>
  );
}

function RefreshButton() {
  const { t } = useTranslation();
  const refresh = useTabbarStore((s) => s.refresh);
  const location = useLocation();

  function handleRefresh() {
    refresh(location.pathname);
  }

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm btn-square my-0 mr-1 rounded-md"
      title={t('widgets.header.reload')}
      onClick={handleRefresh}
    >
      <AppIcon name="rotate-cw" className="size-4" />
    </button>
  );
}

function nextIndex(list: Array<SlotItem>) {
  const index =
    list.length > 0 ? Math.max(...list.map((item) => item.index)) : 0;
  return index + 1;
}

export function LayoutHeader({
  theme: _theme = 'light',
  slotBreadcrumb,
  slotMenu,
  slotGlobalSearch,
  slotPreferences,
  slotThemeToggle,
  slotLanguageToggle,
  slotTimezone,
  slotFullscreen,
  slotNotification,
  slotUserDropdown,
  slotRefresh,
  leftExtra,
  leftExtraIndex,
  rightExtra,
  rightExtraIndex,
  menus = [],
  onClearPreferencesAndLogout,
}: LayoutHeaderProps) {
  const preferences = usePreferencesStore();
  const { header: showPreferencesInHeader } = usePreferencesButtonPosition();

  const globalSearchShortcutKey =
    preferences.shortcutKeys.enable && preferences.shortcutKeys.globalSearch;

  const rightSlots = useMemo(() => {
    const list: Array<SlotItem> = [];

    if (preferences.widget.globalSearch) {
      list.push({ index: REFERENCE_VALUE, name: 'global-search' });
    }

    if (showPreferencesInHeader) {
      list.push({ index: REFERENCE_VALUE + 10, name: 'preferences' });
    }

    if (preferences.widget.themeToggle) {
      list.push({ index: REFERENCE_VALUE + 20, name: 'theme-toggle' });
    }
    if (preferences.widget.languageToggle) {
      list.push({ index: REFERENCE_VALUE + 30, name: 'language-toggle' });
    }
    if (preferences.widget.timezone) {
      list.push({ index: REFERENCE_VALUE + 40, name: 'timezone' });
    }

    if (preferences.widget.fullscreen) {
      list.push({ index: REFERENCE_VALUE + 50, name: 'fullscreen' });
    }

    if (preferences.widget.notification) {
      list.push({ index: REFERENCE_VALUE + 60, name: 'notification' });
    }

    if (rightExtra) {
      const index =
        typeof rightExtraIndex === 'number' && !Number.isNaN(rightExtraIndex)
          ? rightExtraIndex
          : nextIndex(list);
      list.push({ index, name: 'right-extra' });
    }

    const userDropdownIndex = Math.min(1000, nextIndex(list));
    list.push({ index: userDropdownIndex, name: 'user-dropdown' });

    return list.toSorted((a, b) => a.index - b.index);
  }, [
    preferences.widget,
    showPreferencesInHeader,
    rightExtra,
    rightExtraIndex,
  ]);

  const leftSlots = useMemo(() => {
    const list: Array<SlotItem> = [];

    if (preferences.widget.refresh) {
      list.push({ index: 0, name: 'refresh' });
    }

    if (leftExtra) {
      const index =
        typeof leftExtraIndex === 'number' && !Number.isNaN(leftExtraIndex)
          ? leftExtraIndex
          : nextIndex(list);
      list.push({ index, name: 'left-extra' });
    }
    return list.toSorted((a, b) => a.index - b.index);
  }, [preferences.widget.refresh, leftExtra, leftExtraIndex]);

  function renderRightSlot(name: string): ReactNode {
    switch (name) {
      case 'global-search': {
        return (
          slotGlobalSearch ?? (
            <GlobalSearch
              className="mr-1 sm:mr-4"
              enableShortcutKey={globalSearchShortcutKey}
              menus={menus}
            />
          )
        );
      }
      case 'preferences': {
        return (
          slotPreferences ?? (
            <PreferencesButton
              className="mr-1"
              onClearPreferencesAndLogout={onClearPreferencesAndLogout}
            />
          )
        );
      }
      case 'theme-toggle': {
        return slotThemeToggle ?? <ThemeToggle className="mt-0.5 mr-1" />;
      }
      case 'language-toggle': {
        return slotLanguageToggle ?? <LanguageToggle className="mr-1" />;
      }
      case 'timezone': {
        return slotTimezone ?? <TimezoneButton className="mt-0.5 mr-1" />;
      }
      case 'fullscreen': {
        return slotFullscreen ?? <FullScreenButton />;
      }
      case 'notification': {
        return slotNotification ?? <Notification />;
      }
      case 'right-extra': {
        return rightExtra;
      }
      case 'user-dropdown': {
        return slotUserDropdown;
      }
      default: {
        return null;
      }
    }
  }

  return (
    <div className="flex h-full min-w-0 flex-1 items-center">
      {leftSlots
        .filter((item) => item.index < REFERENCE_VALUE)
        .map((slot) => (
          <Fragment key={slot.name}>
            {slot.name === 'refresh'
              ? (slotRefresh ?? <RefreshButton />)
              : slot.name === 'left-extra'
                ? leftExtra
                : null}
          </Fragment>
        ))}
      <div className="flex-center hidden lg:block">{slotBreadcrumb}</div>
      {leftSlots
        .filter((item) => item.index > REFERENCE_VALUE)
        .map((slot) => (
          <Fragment key={slot.name}>
            {slot.name === 'left-extra' ? leftExtra : null}
          </Fragment>
        ))}
      <div
        className={`menu-align-${preferences.header.menuAlign} flex h-full min-w-0 flex-1 items-center`}
      >
        {slotMenu}
      </div>
      <div className="flex h-full min-w-0 shrink-0 items-center">
        {rightSlots.map((slot) => (
          <Fragment key={slot.name}>{renderRightSlot(slot.name)}</Fragment>
        ))}
      </div>
    </div>
  );
}
