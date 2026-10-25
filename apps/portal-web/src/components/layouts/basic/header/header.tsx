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
  /** Logo 主题 */
  theme?: string;

  /** 面包屑插槽 */
  slotBreadcrumb?: ReactNode;

  /** 菜单插槽 */
  slotMenu?: ReactNode;

  /** 自定义 widget 插槽（覆盖内置默认实现） */
  slotGlobalSearch?: ReactNode;
  slotPreferences?: ReactNode;
  slotThemeToggle?: ReactNode;
  slotLanguageToggle?: ReactNode;
  slotTimezone?: ReactNode;
  slotFullscreen?: ReactNode;
  slotNotification?: ReactNode;
  slotUserDropdown?: ReactNode;
  slotRefresh?: ReactNode;

  /** header-left 自定义内容（header-left-N 插槽等价） */
  leftExtra?: ReactNode;

  /**
   * leftExtra 的排序索引（等价于 header-left-N 插槽名中的 N；
   * 小于 100 时渲染在面包屑之前，大于 100 时渲染在面包屑之后）
   */
  leftExtraIndex?: number;

  /** header-right 自定义内容（header-right-N 插槽等价） */
  rightExtra?: ReactNode;

  /**
   * rightExtra 的排序索引（等价于 header-right-N 插槽名中的 N；
   * 与 widget 按钮统一排序，用户下拉框始终最后 —— NaN 时自动分配
   * 下一个索引，超过 1000 时用户下拉框固定在 1000）
   */
  rightExtraIndex?: number;

  /** 全局搜索默认数据（accessMenus 等价） */
  menus?: MenuRecordRaw[];

  /** 清空偏好并登出（clearPreferencesAndLogout emit 等价） */
  onClearPreferencesAndLogout?: () => void;
}

/** 插槽列表类型 */
type SlotItem = { index: number; name: string };

/**
 * 右侧插槽的索引基准值（= 全局搜索的位置）：
 * - rightSlots 按 index 升序渲染 → index 越大越靠右
 * - 全局搜索固定为 REFERENCE_VALUE，其后各组件按 +10 递增
 * - 左侧区域的 `index < REFERENCE_VALUE` / `> REFERENCE_VALUE` 过滤只作用于
 *   leftSlots，不受右侧插槽索引影响
 * 需要把自定义插槽排到搜索框左边/右边时，用 rightExtraIndex 相对它取值即可。
 */
export const REFERENCE_VALUE = 100;

/** 全屏切换（上游全屏组件 / useFullscreen 等价：跟随 fullscreenchange 事件） */
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
      className="btn btn-ghost btn-sm btn-circle mr-1"
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

/** 刷新按钮（useRefresh 等价：按当前路由名称刷新标签页） */
function RefreshButton() {
  const { t } = useTranslation();
  const refresh = useTabbarStore((s) => s.refresh);
  const location = useLocation();

  function handleRefresh() {
    // tab name 即路由路径（React port 中 name === path，无 query）——
    // 等价参考实现 useRefresh 的 refresh(router) 分支（当前路由刷新）
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

/**
 * 获取列表下一个索引值(用于排序)
 */
function nextIndex(list: Array<SlotItem>) {
  const index =
    list.length > 0 ? Math.max(...list.map((item) => item.index)) : 0;
  return index + 1;
}

/**
 * LayoutHeader — 1:1 port of basic/header/header.vue.
 * 左右插槽排序引擎：按 preferences.widget.* 与 preferencesButtonPosition
 * 组装 widget 顺序（全局搜索 → 偏好设置/主题/语言/时区 → 全屏 → 通知 → 用户下拉）。
 */
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
  // 等价于 use-preferences 的 globalSearchShortcutKey computed：enable && globalSearch
  const globalSearchShortcutKey =
    preferences.shortcutKeys.enable && preferences.shortcutKeys.globalSearch;

  const rightSlots = useMemo(() => {
    const list: Array<SlotItem> = [];

    // 全局搜索
    if (preferences.widget.globalSearch) {
      list.push({ index: REFERENCE_VALUE, name: 'global-search' });
    }

    // 偏好设置按钮（齿轮）：仅此按钮受 preferences.app.enablePreferences /
    // preferencesButtonPosition（showPreferencesInHeader）控制
    if (showPreferencesInHeader) {
      list.push({ index: REFERENCE_VALUE + 10, name: 'preferences' });
    }

    // 主题 / 语言 / 时区切换：独立受各自 preferences.widget.* 开关控制，
    // 不再嵌套在偏好设置分支内 —— 否则关闭齿轮（enablePreferences=false）
    // 或把齿轮移到悬浮位（preferencesButtonPosition='fixed'）时，这些入口会被连坐隐藏
    if (preferences.widget.themeToggle) {
      list.push({ index: REFERENCE_VALUE + 20, name: 'theme-toggle' });
    }
    if (preferences.widget.languageToggle) {
      list.push({ index: REFERENCE_VALUE + 30, name: 'language-toggle' });
    }
    if (preferences.widget.timezone) {
      list.push({ index: REFERENCE_VALUE + 40, name: 'timezone' });
    }

    // 全屏
    if (preferences.widget.fullscreen) {
      list.push({ index: REFERENCE_VALUE + 50, name: 'fullscreen' });
    }

    // 消息通知
    if (preferences.widget.notification) {
      list.push({ index: REFERENCE_VALUE + 60, name: 'notification' });
    }

    // header-right 自定义内容（等价于 header-right-N 插槽：N 为数字时用 N，
    // 否则自动分配下一个索引）
    if (rightExtra) {
      const index =
        typeof rightExtraIndex === 'number' && !Number.isNaN(rightExtraIndex)
          ? rightExtraIndex
          : nextIndex(list);
      list.push({ index, name: 'right-extra' });
    }

    // 最后追加用户下拉框（索引超过 1000 时固定在 1000）
    const userDropdownIndex = Math.min(1000, nextIndex(list));
    list.push({ index: userDropdownIndex, name: 'user-dropdown' });

    // 按照索引排序，保证插槽顺序
    return list.toSorted((a, b) => a.index - b.index);
  }, [
    preferences.widget,
    showPreferencesInHeader,
    rightExtra,
    rightExtraIndex,
  ]);

  const leftSlots = useMemo(() => {
    const list: Array<SlotItem> = [];

    // 刷新
    if (preferences.widget.refresh) {
      list.push({ index: 0, name: 'refresh' });
    }

    // header-left 自定义内容（等价于 header-left-N 插槽：N 为数字时用 N，
    // 否则自动分配下一个索引）
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
        // class 直接传组件根元素（等价参考实现 的 Vue class 透传 ——
        // 不得包 span：inline 包装盒的高度由字体度量决定，内容溢出方向
        // 不可控，会把 widget 顶出 header 垂直中心）
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
