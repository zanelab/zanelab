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

  isMixedNav: boolean;
  isSideMixedNav: boolean;
  isHeaderMixedNav: boolean;
  isHeaderSidebarNav: boolean;
  isSideMode: boolean;
}

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

export function usePreferencesButtonPosition(): PreferencesButtonPosition {
  const preferences = usePreferencesStore();

  return useMemo(() => {
    const { enablePreferences, preferencesButtonPosition, isMobile, layout } =
      preferences.app;
    const { enable: headerEnable, hidden: headerHidden } = preferences.header;
    const { hidden: sidebarHidden } = preferences.sidebar;

    if (!enablePreferences) {
      return { fixed: false, header: false, userDropdown: false };
    }

    const contentIsMaximize = headerHidden && sidebarHidden;

    const isHeaderPosition = preferencesButtonPosition === 'header';
    const isUserDropdownPosition =
      preferencesButtonPosition === 'user-dropdown';

    if (preferencesButtonPosition !== 'auto') {
      return {
        fixed: preferencesButtonPosition === 'fixed',
        header: isHeaderPosition,
        userDropdown: isUserDropdownPosition,
      };
    }

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
