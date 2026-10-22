import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';

import { usePreferencesStore } from '../../../../stores/preferences-store';
import { usePreferencesButtonPosition } from '../../hooks/use-preferences';
import { AnchoredPortal } from '@zanelab/ui';
import { AppIcon } from '../../../icons/app-icon';
import { LockScreenModal } from '../lock-screen/lock-screen-modal';
import { PreferencesDrawer } from '../preferences/preferences-drawer';
import { useOpenPreferences } from '../preferences/use-open-preferences';

export interface UserDropdownMenu {
  handler: () => void;
  icon?: ReactNode;
  text: string;

  children?: UserDropdownMenu[];
}

interface UserDropdownProps {
  avatar?: string;

  description?: string;

  enableShortcutKey?: boolean;

  menus?: UserDropdownMenu[];

  tagText?: string;

  text?: string;

  trigger?: 'both' | 'click' | 'hover';

  hoverDelay?: number;

  onLockScreen?: (password: string) => void;

  onLogout?: () => void;

  onClearPreferencesAndLogout?: () => void;
}

function Avatar({ avatar, alt }: { avatar: string; alt: string }) {
  return (
    <div
      className={`flex-center size-full overflow-hidden rounded-full ${avatar ? '' : 'bg-primary/15 text-primary text-sm font-semibold'}`}
    >
      {avatar ? (
        <img src={avatar} alt={alt} className="size-full object-cover" />
      ) : (
        <span className="uppercase">{alt?.[0] || '?'}</span>
      )}
    </div>
  );
}

const ChevronLeftIcon = () => (
  <AppIcon name="chevron-left" className="mr-2 ml-auto size-3 opacity-50" />
);

function DropdownMenuItems({ items }: { items: UserDropdownMenu[] }) {
  return items.map((menu) =>
    menu.children?.length ? (
      <div
        key={menu.text}
        className="dropdown dropdown-hover dropdown-left block w-full"
      >
        <button
          type="button"
          className="hover:bg-base-200/60 flex w-full cursor-pointer items-center px-4 py-1 text-sm leading-8"
        >
          {menu.icon ? <span className="mr-2 size-4">{menu.icon}</span> : null}
          {menu.text}
          <ChevronLeftIcon />
        </button>
        <div className="dropdown-content border-base-300 bg-base-100 max-h-75 max-w-62 min-w-40 overflow-y-auto rounded-md border py-1 shadow-lg">
          <DropdownMenuItems items={menu.children} />
        </div>
      </div>
    ) : (
      <button
        key={menu.text}
        type="button"
        className="hover:bg-base-200/60 flex w-full cursor-pointer items-center px-4 py-1 text-sm leading-8"
        onClick={menu.handler}
      >
        {menu.icon ? <span className="mr-2 size-4">{menu.icon}</span> : null}
        {menu.text}
      </button>
    ),
  );
}

export function UserDropdown({
  avatar = '',
  description = '',
  enableShortcutKey = true,
  menus = [],
  tagText = '',
  text = '',
  trigger = 'click',
  hoverDelay = 500,
  onLockScreen,
  onLogout,
  onClearPreferencesAndLogout,
}: UserDropdownProps) {
  const { t } = useTranslation();
  const preferences = usePreferencesStore();
  const { userDropdown: showInUserDropdown } = usePreferencesButtonPosition();
  const { setOpenPreferences, handleOpenPreferences } = useOpenPreferences();

  const [openPopover, setOpenPopover] = useState(false);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const hoverTimer = useRef<number | undefined>(undefined);
  const anchorRef = useRef<HTMLDivElement>(null);

  const hoverEnabled = trigger === 'hover' || trigger === 'both';
  const clickEnabled = trigger === 'click' || trigger === 'both';

  const altView =
    typeof navigator !== 'undefined' && /win/i.test(navigator.platform)
      ? 'Alt'
      : '⌥';

  const globalLockScreenShortcutKey = preferences.shortcutKeys.globalLockScreen;
  const globalLogoutShortcutKey = preferences.shortcutKeys.globalLogout;
  const enableLogoutShortcutKey = enableShortcutKey && globalLogoutShortcutKey;
  const enableLockScreenShortcutKey =
    enableShortcutKey && globalLockScreenShortcutKey;
  const shortcutKeysEnabled =
    enableShortcutKey && preferences.shortcutKeys.enable;

  function clearHoverTimer() {
    if (hoverTimer.current !== undefined) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = undefined;
    }
  }

  function handleMouseEnter() {
    if (!hoverEnabled) return;
    clearHoverTimer();
    hoverTimer.current = window.setTimeout(
      () => setOpenPopover(true),
      hoverDelay,
    );
  }

  function handleMouseLeave() {
    if (!hoverEnabled) return;
    clearHoverTimer();
    hoverTimer.current = window.setTimeout(
      () => setOpenPopover(false),
      hoverDelay,
    );
  }

  useEffect(() => clearHoverTimer, []);

  function handleOpenLock() {
    setLockModalOpen(true);
  }

  function handleSubmitLock(lockScreenPassword: string) {
    setLockModalOpen(false);
    onLockScreen?.(lockScreenPassword);
  }

  function handleLogout() {
    setLogoutModalOpen(true);
    setOpenPopover(false);
  }

  function handleSubmitLogout() {
    onLogout?.();
    setLogoutModalOpen(false);
  }

  function handleOpenSettings() {
    handleOpenPreferences();
  }

  useEffect(() => {
    if (!shortcutKeysEnabled) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (!e.altKey) return;
      if (e.code === 'KeyQ' && enableLogoutShortcutKey) {
        e.preventDefault();
        handleLogout();
      } else if (e.code === 'KeyL' && enableLockScreenShortcutKey) {
        e.preventDefault();
        handleOpenLock();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    shortcutKeysEnabled,
    enableLogoutShortcutKey,
    enableLockScreenShortcutKey,
  ]);

  return (
    <>
      {showInUserDropdown
        ? createPortal(
            <PreferencesDrawer
              onClose={() => setOpenPreferences(false)}
              onClearPreferencesAndLogout={onClearPreferencesAndLogout}
            />,
            document.body,
          )
        : null}

      <div className="relative" ref={anchorRef}>
        <button
          type="button"
          className="hover:bg-base-200 mr-2 ml-1 cursor-pointer rounded-full p-1.5"
          onClick={() => {
            if (clickEnabled) {
              setOpenPopover((v) => !v);
            } else {
              setOpenPopover(true);
            }
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="size-8 shrink-0">
            <Avatar avatar={avatar} alt={text} />
          </div>
        </button>

        <AnchoredPortal
          open={openPopover}
          anchorRef={anchorRef}
          onClose={() => setOpenPopover(false)}
          offsetX={8}
        >
          <div
            className="border-base-300 bg-base-100 w-60 rounded-md border py-1 shadow-lg"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="flex items-center gap-2 px-4 py-3">
              <div className="size-10 shrink-0">
                <Avatar avatar={avatar} alt={text} />
              </div>
              <div className="min-w-0 flex-1">
                {tagText || text ? (
                  <div className="text-base-content flex items-center text-sm font-semibold">
                    {text}
                    {tagText ? (
                      <span className="badge badge-sm bg-success/15 text-success ml-2 border-none">
                        {tagText}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {description ? (
                  <div
                    className="text-base-content/50 w-40 truncate text-xs"
                    title={description}
                  >
                    {description}
                  </div>
                ) : null}
              </div>
            </div>

            <DropdownMenuItems items={menus} />

            {showInUserDropdown ? (
              <button
                type="button"
                className="hover:bg-base-200/60 flex w-full cursor-pointer items-center px-4 py-1 text-sm leading-8"
                onClick={handleOpenSettings}
              >
                <AppIcon name="settings" className="mr-2 size-4" />
                {t('widgets.preferencesButton')}
              </button>
            ) : null}

            {preferences.widget.lockScreen ? (
              <button
                type="button"
                className="hover:bg-base-200/60 flex w-full cursor-pointer items-center px-4 py-1 text-sm leading-8"
                onClick={handleOpenLock}
              >
                <AppIcon name="lock" className="mr-2 size-4" />
                {t('widgets.lockScreen.title')}
                {enableLockScreenShortcutKey ? (
                  <span className="text-base-content/50 mr-2 ml-auto text-xs tracking-widest">
                    {altView} L
                  </span>
                ) : null}
              </button>
            ) : null}

            <button
              type="button"
              className="hover:bg-base-200/60 flex w-full cursor-pointer items-center px-4 py-1 text-sm leading-8"
              onClick={handleLogout}
            >
              <AppIcon name="log-out" className="mr-2 size-4" />
              {t('widgets.userDropdown.logout')}
              {enableLogoutShortcutKey ? (
                <span className="text-base-content/50 mr-2 ml-auto text-xs tracking-widest">
                  {altView} Q
                </span>
              ) : null}
            </button>
          </div>
        </AnchoredPortal>
      </div>

      {preferences.widget.lockScreen ? (
        <LockScreenModal
          avatar={avatar}
          text={text}
          open={lockModalOpen}
          onOpenChange={setLockModalOpen}
          onSubmit={handleSubmitLock}
        />
      ) : null}

      {logoutModalOpen
        ? createPortal(
            <div className="modal modal-open modal-middle">
              <div className="modal-box max-w-md">
                <h3 className="border-base-300 text-base-content mb-4 border-b pb-2 text-lg font-semibold">
                  {t('widgets.userDropdown.notice')}
                </h3>
                <div className="text-base-content flex min-h-10 items-center px-8 py-4 text-base">
                  {t('widgets.userDropdown.logoutConfirm')}
                </div>
                <div className="modal-action mr-3 border-none">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setLogoutModalOpen(false)}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSubmitLogout}
                  >
                    {t('common.confirm')}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
