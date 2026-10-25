import { useMemo } from 'react';
import { usePreferencesStore } from '../../../stores/preferences-store';

export interface PreferencesButtonPosition {
  fixed: boolean;
  header: boolean;
  userDropdown: boolean;
}

export interface AuthPanelPosition {
  authPanelLeft: boolean;
  authPanelCenter: boolean;
  authPanelRight: boolean;
}

export interface LayoutFlags {
  isHeaderNav: boolean;
  /** 仅 mixed-nav（preferences 语义 —— 不含 header-sidebar-nav！） */
  isMixedNav: boolean;
  isSideMixedNav: boolean;
  isHeaderMixedNav: boolean;
  isHeaderSidebarNav: boolean;
  isSideMode: boolean;
}

/**
 * useLayoutFromPreferences — React equivalent of the layout computeds in
 * reference @core/preferences/src/use-preferences.ts（注意与 layout-ui 的
 * useLayout 区别：那里的 isMixedNav 包含 header-sidebar-nav，而 preferences
 * 语义的 isMixedNav 仅 mixed-nav。layout.vue / use-mixed-menu.ts 用的是后者）。
 */
export function useLayoutFromPreferences(): LayoutFlags {
  const preferences = usePreferencesStore();

  return useMemo(() => {
    const layout = preferences.app.layout;
    const isHeaderNav = layout === 'header-nav';
    const isMixedNav = layout === 'mixed-nav';
    const isSideMixedNav = layout === 'sidebar-mixed-nav';
    const isHeaderMixedNav = layout === 'header-mixed-nav';
    const isHeaderSidebarNav = layout === 'header-sidebar-nav';
    const isSideMode =
      isMixedNav ||
      isSideMixedNav ||
      layout === 'sidebar-nav' ||
      isHeaderMixedNav ||
      isHeaderSidebarNav;

    return {
      isHeaderNav,
      isMixedNav,
      isSideMixedNav,
      isHeaderMixedNav,
      isHeaderSidebarNav,
      isSideMode,
    };
  }, [preferences.app.layout]);
}

/**
 * useAuthPanelPosition — React equivalent of the
 * `authPanelLeft/authPanelCenter/authPanelRight` computeds in reference
 * @core/preferences/src/use-preferences.ts.
 *
 * 登录注册页面布局：面板居左 / 居中 / 居右（app.authPageLayout）。
 */
export function useAuthPanelPosition(): AuthPanelPosition {
  const authPageLayout = usePreferencesStore((s) => s.app.authPageLayout);

  return useMemo(
    () => ({
      authPanelLeft: authPageLayout === 'panel-left',
      authPanelCenter: authPageLayout === 'panel-center',
      authPanelRight: authPageLayout === 'panel-right',
    }),
    [authPageLayout],
  );
}

/**
 * usePreferencesButtonPosition — React equivalent of the
 * `preferencesButtonPosition` computed in reference
 * @core/preferences/src/use-preferences.ts.
 *
 * 偏好设置按钮位置：fixed（右侧悬浮）/ header（顶栏）/ userDropdown（用户下拉菜单）。
 */
export function usePreferencesButtonPosition(): PreferencesButtonPosition {
  const preferences = usePreferencesStore();

  return useMemo(() => {
    const { enablePreferences, preferencesButtonPosition, isMobile, layout } =
      preferences.app;
    const { enable: headerEnable, hidden: headerHidden } = preferences.header;
    const { hidden: sidebarHidden } = preferences.sidebar;

    // 如果没有启用偏好设置按钮
    if (!enablePreferences) {
      return { fixed: false, header: false, userDropdown: false };
    }

    const contentIsMaximize = headerHidden && sidebarHidden;

    const isHeaderPosition = preferencesButtonPosition === 'header';
    const isUserDropdownPosition =
      preferencesButtonPosition === 'user-dropdown';

    // 如果设置了固定位置
    if (preferencesButtonPosition !== 'auto') {
      return {
        fixed: preferencesButtonPosition === 'fixed',
        header: isHeaderPosition,
        userDropdown: isUserDropdownPosition,
      };
    }

    // 如果是全屏模式或者没有固定在顶部
    const isFullContent = layout === 'full-content';
    const fixed =
      contentIsMaximize || isFullContent || isMobile || !headerEnable;

    return {
      fixed,
      header: !fixed,
      userDropdown: !fixed && isUserDropdownPosition,
    };
  }, [preferences]);
}
