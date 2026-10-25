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
  /** 子菜单（多级）：有 children 的项为目录语义（不导航，悬停级联向左弹出） */
  children?: UserDropdownMenu[];
}

interface UserDropdownProps {
  /** 头像 */
  avatar?: string;

  /** 描述 */
  description?: string;

  /** 是否启用快捷键 */
  enableShortcutKey?: boolean;

  /** 菜单数组 */
  menus?: UserDropdownMenu[];

  /** 标签文本 */
  tagText?: string;

  /** 文本 */
  text?: string;

  /** 触发方式 */
  trigger?: 'both' | 'click' | 'hover';

  /** hover 触发时，延迟响应的时间 */
  hoverDelay?: number;

  /** 锁屏提交（等价于 accessStore.lockScreen(password)） */
  onLockScreen?: (password: string) => void;

  /** 退出登录（确认弹窗后触发） */
  onLogout?: () => void;

  /** 清除偏好并退出登录 */
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

/**
 * 自定义菜单项（递归）：叶子=按钮（handler 跳转）；父项=目录（daisyUI
 * dropdown-hover 悬停级联，dropdown-left 向左弹——下拉框锚定 header 最右缘，
 * 右弹会溢出视口）。子面板结构与主面板一致，任意层级递归成立。
 */
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
        {/* 级联子面板（对齐旧项目租户管理 Popover：min 150 / max 250 / 最高 300 可滚） */}
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

/**
 * UserDropdown — 1:1 port of widgets/user-dropdown/user-dropdown.vue.
 *
 * 结构对应：
 * - DropdownMenu (shadcn) → 受控弹出面板（click / hover 触发，hover 有延迟）
 * - LockScreenModal + accessStore.lockScreen → LockScreenModal + onLockScreen 回调
 * - Preferences ref.open() → useOpenPreferences().handleOpenPreferences()
 * - useMagicKeys Alt+L / Alt+Q → window keydown（e.code 判定）
 */
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

  // hover 触发（等价于 useHoverToggle，带 hoverDelay 延迟）
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

  // 设置 - 打开偏好设置抽屉
  function handleOpenSettings() {
    handleOpenPreferences();
  }

  // Alt+L 锁屏 / Alt+Q 退出登录（等价于 useMagicKeys whenever）
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
      {/* 偏好设置抽屉（preferencesButtonPosition.userDropdown 时由本组件承担） */}
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
        {/* 触发器：头像 */}
        <button
          type="button"
          className="hover:bg-base-200 mr-2 ml-1 cursor-pointer rounded-full p-1.5"
          onClick={() => {
            // click/both：点击切换展开；hover：点击仅展开（触屏等无 hover
            // 环境仍可用，且避免悬停展开后一次点击立刻收起）
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

        {/* portal 到 body（reka-ui DropdownMenuPortal 等价）—— header 外层
            overflow-hidden 会裁剪内联 absolute 下拉；mr-2 → offsetX 8 */}
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
            {/* 用户信息（对齐旧项目 Avatar：头像 40px + 姓名 + 租户名 12px 省略） */}
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

            {/* 自定义菜单（支持多级：父项悬停级联，见 DropdownMenuItems） */}
            <DropdownMenuItems items={menus} />

            {/* 设置（偏好设置按钮位于用户下拉时显示） */}
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

            {/* 锁定屏幕 */}
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

            {/* 退出登录 */}
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

      {/* 锁屏密码弹窗 */}
      {preferences.widget.lockScreen ? (
        <LockScreenModal
          avatar={avatar}
          text={text}
          open={lockModalOpen}
          onOpenChange={setLockModalOpen}
          onSubmit={handleSubmitLock}
        />
      ) : null}

      {/* 退出登录确认弹窗 */}
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
