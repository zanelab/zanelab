import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { usePreferencesStore } from '../../../stores/preferences-store';
import { useLayoutStore } from '../../../stores/layout-store';
import { useLayout } from '../hooks/use-layout';
import type { MenuRecordRaw } from '@zanelab/types';
import { getRouteMeta } from '../../../router/route-meta';
import { LayoutCore } from './layout/layout';
import { LayoutMenu } from './menu/menu';
import { LayoutMixedMenu } from './menu/mixed-menu';
import { LayoutExtraMenu } from './menu/extra-menu';
import { LayoutHeader } from './header/header';
import { LayoutContent } from './content/content';
import { LayoutContentSpinner } from './content/content-spinner';
import { LayoutFooter } from './footer/footer';
import { LayoutTabbar } from './tabbar/tabbar';
import { Breadcrumb } from '../widgets/breadcrumb';
import { Copyright } from './copyright/copyright';
import { systemName } from '../../../locales/i18n';
import { BackTop } from '../widgets/back-top';
import { Logo } from '@zanelab/ui';
import { useMixedMenu } from './menu/use-mixed-menu';
import { useExtraMenu } from './menu/use-extra-menu';
import {
  usePreferencesButtonPosition,
  useLayoutFromPreferences,
} from '../hooks/use-preferences';
import { useTabbarStore } from '../../../stores/tabbar-store';
import { useTimezoneStore } from '../../../stores/timezone-store';
import { Preferences } from '../widgets/preferences/preferences';
import { CheckUpdates } from '../widgets/check-updates';

interface BasicLayoutProps {
  menus: MenuRecordRaw[];
  userDropdown?: ReactNode;
  notification?: ReactNode;
  globalSearch?: ReactNode;
  themeToggle?: ReactNode;

  rightExtra?: ReactNode;

  rightExtraIndex?: number;

  slotLogoText?: ReactNode;

  extra?: ReactNode;

  lockScreen?: ReactNode;

  contentLayer?: ReactNode;

  clickLogo?: () => void;

  onClearPreferencesAndLogout?: () => void;
}

export function BasicLayout({
  menus,
  userDropdown,
  notification,
  globalSearch,
  themeToggle,
  rightExtra,
  rightExtraIndex,
  slotLogoText,
  extra,
  lockScreen,
  contentLayer,
  clickLogo,
  onClearPreferencesAndLogout,
}: BasicLayoutProps) {
  const preferences = usePreferencesStore();

  const layout = useLayout(preferences.app.layout, preferences.app.isMobile);
  const prefsLayout = useLayoutFromPreferences();
  const { fixed: showPreferencesFixed } = usePreferencesButtonPosition();
  const location = useLocation();

  const {
    handleMenuSelect,
    handleMenuOpen,
    headerActive,
    headerMenus,
    sidebarActive,
    sidebarMenus,
    mixHeaderMenus,
    sidebarVisible,
  } = useMixedMenu({ menus, currentPath: location.pathname });

  const {
    extraActiveMenu,
    extraMenus,
    handleDefaultSelect,
    handleMenuMouseEnter,
    handleMixedMenuSelect,
    handleSideMouseLeave,
    setSidebarExtraVisible,
    sidebarExtraVisible,
  } = useExtraMenu({ menus: mixHeaderMenus, currentPath: location.pathname });

  const [sidebarExpandOnHovering, setSidebarExpandOnHovering] = useState(false);
  const isMenuRounded = preferences.navigation.styleType === 'rounded';
  const isDark = useLayoutStore((s) => s.isDark);
  const tabbarStoreRefresh = useTabbarStore((s) => s.refresh);
  const timezone = useTimezoneStore((s) => s.timezone);

  const prevTimezoneRef = useRef(timezone);
  useEffect(() => {
    const prev = prevTimezoneRef.current;
    prevTimezoneRef.current = timezone;
    if (prev === timezone) return;
    function refreshAll() {
      useTabbarStore.setState({ cachedTabs: new Set() });
      tabbarStoreRefresh(location.pathname);
    }
    refreshAll();
  }, [timezone, tabbarStoreRefresh, location.pathname]);

  useEffect(() => {
    if (
      preferences.app.layout === 'sidebar-mixed-nav' &&
      preferences.sidebar.hidden
    ) {
      preferences.updatePreferences({ sidebar: { hidden: false } });
    }
  }, [preferences.app.layout, preferences.sidebar.hidden, preferences]);

  useEffect(() => {
    if (
      (preferences.app.layout === 'header-mixed-nav' ||
        preferences.app.layout === 'sidebar-mixed-nav') &&
      getRouteMeta(location.pathname)?.hideInMenu
    ) {
      setSidebarExtraVisible(false);
    }
  }, []);

  const sidebarTheme = useMemo<'dark' | 'light'>(() => {
    return isDark || preferences.theme.semiDarkSidebar ? 'dark' : 'light';
  }, [isDark, preferences.theme.semiDarkSidebar]);

  const sidebarThemeSub = useMemo<'dark' | 'light'>(() => {
    return isDark || preferences.theme.semiDarkSidebarSub ? 'dark' : 'light';
  }, [isDark, preferences.theme.semiDarkSidebarSub]);

  const headerTheme = useMemo<'dark' | 'light'>(() => {
    return isDark || preferences.theme.semiDarkHeader ? 'dark' : 'light';
  }, [isDark, preferences.theme.semiDarkHeader]);

  const logoClass = useMemo(() => {
    const { collapsedShowTitle } = preferences.sidebar;
    const classes: string[] = [];

    if (
      collapsedShowTitle &&
      preferences.sidebar.collapsed &&
      !prefsLayout.isMixedNav
    ) {
      classes.push('mx-auto');
    }

    if (prefsLayout.isSideMixedNav) {
      classes.push('flex-center');
    }

    return classes.join(' ');
  }, [preferences.sidebar, prefsLayout.isMixedNav, prefsLayout.isSideMixedNav]);

  const logoCollapsed = useMemo(() => {
    if (preferences.app.isMobile && preferences.sidebar.collapsed) {
      return true;
    }
    if (
      prefsLayout.isHeaderNav ||
      prefsLayout.isMixedNav ||
      prefsLayout.isHeaderSidebarNav
    ) {
      return false;
    }
    return (
      preferences.sidebar.collapsed ||
      prefsLayout.isSideMixedNav ||
      prefsLayout.isHeaderMixedNav
    );
  }, [preferences.app.isMobile, preferences.sidebar.collapsed, prefsLayout]);

  const showHeaderNav = useMemo(() => {
    return (
      !preferences.app.isMobile &&
      (prefsLayout.isHeaderNav ||
        prefsLayout.isMixedNav ||
        prefsLayout.isHeaderMixedNav)
    );
  }, [preferences.app.isMobile, prefsLayout]);

  const logoTheme = useMemo<'dark' | 'light'>(() => {
    const showLogoInHeader =
      !prefsLayout.isSideMode ||
      prefsLayout.isHeaderSidebarNav ||
      prefsLayout.isMixedNav ||
      preferences.app.isMobile;
    return showLogoInHeader ? headerTheme : sidebarTheme;
  }, [prefsLayout, preferences.app.isMobile, headerTheme, sidebarTheme]);

  return (
    <>
      <LayoutCore
        layout={preferences.app.layout}
        isMobile={preferences.app.isMobile}
        headerHeight={preferences.header.height}
        headerMode={preferences.header.mode}
        headerVisible={preferences.header.enable}
        headerHidden={preferences.header.hidden}
        headerToggleSidebarButton={preferences.widget.sidebarToggle}
        headerTheme={headerTheme}
        sidebarEnable={sidebarVisible}
        sidebarHidden={preferences.sidebar.hidden}
        sidebarWidth={preferences.sidebar.width}
        sideCollapseWidth={preferences.sidebar.collapseWidth}
        sidebarMixedWidth={preferences.sidebar.mixedWidth}
        sidebarExtraCollapsedWidth={preferences.sidebar.extraCollapsedWidth}
        sidebarTheme={sidebarTheme}
        sidebarThemeSub={sidebarThemeSub}
        sidebarCollapsedButton={preferences.sidebar.collapsedButton}
        sidebarFixedButton={preferences.sidebar.fixedButton}
        sidebarCollapseShowTitle={preferences.sidebar.collapsedShowTitle}
        tabbarEnable={preferences.tabbar.enable}
        tabbarHeight={preferences.tabbar.height}
        footerEnable={preferences.footer.enable}
        footerFixed={preferences.footer.fixed}
        footerHeight={preferences.footer.height}
        contentCompact={preferences.app.contentCompact}
        contentCompactWidth={preferences.app.contentCompactWidth}
        contentPadding={preferences.app.contentPadding}
        contentPaddingTop={preferences.app.contentPaddingTop}
        contentPaddingBottom={preferences.app.contentPaddingBottom}
        contentPaddingLeft={preferences.app.contentPaddingLeft}
        contentPaddingRight={preferences.app.contentPaddingRight}
        zIndex={preferences.app.zIndex}
        sidebarCollapsed={preferences.sidebar.collapsed}
        sidebarExpandOnHover={preferences.sidebar.expandOnHover}
        sidebarExpandOnHovering={sidebarExpandOnHovering}
        sidebarExtraVisible={sidebarExtraVisible}
        sidebarExtraCollapse={preferences.sidebar.extraCollapse}
        sidebarDraggable={preferences.sidebar.draggable}
        onToggleSidebar={() => preferences.toggleSidebar()}
        onSideMouseLeave={handleSideMouseLeave}
        onUpdateSidebarWidth={(w) =>
          preferences.updatePreferences({ sidebar: { width: w } })
        }
        onUpdateSidebarExpandOnHover={(v) =>
          preferences.updatePreferences({ sidebar: { expandOnHover: v } })
        }
        onClickMask={() => preferences.setSidebarCollapsed(true)}

        onSetSidebarCollapsed={preferences.setSidebarCollapsed}
        onSetSidebarExpandOnHovering={setSidebarExpandOnHovering}
        onSetSidebarExtraVisible={setSidebarExtraVisible}
        onSetSidebarExtraCollapse={(c) =>
          preferences.updatePreferences({ sidebar: { extraCollapse: c } })
        }
        slotLogo={
          preferences.logo.enable ? (
            <Logo
              fit={preferences.logo.fit}
              className={logoClass}
              collapsed={logoCollapsed}
              src={preferences.logo.source}
              srcDark={preferences.logo.sourceDark}
              text={preferences.app.name}
              theme={logoTheme}
              slotText={slotLogoText}
              onClick={
                clickLogo
                  ? (e: React.MouseEvent) => {
                      e.preventDefault();
                      clickLogo();
                    }
                  : undefined
              }
            />
          ) : null
        }
        slotHeader={
          <LayoutHeader
            theme={headerTheme}
            menus={menus}
            slotBreadcrumb={
              !showHeaderNav && preferences.breadcrumb.enable ? (
                <Breadcrumb
                  hideWhenOnlyOne={preferences.breadcrumb.hideOnlyOne}
                  showHome={preferences.breadcrumb.showHome}
                  showIcon={preferences.breadcrumb.showIcon}
                  type={preferences.breadcrumb.styleType}
                />
              ) : null
            }
            slotMenu={
              showHeaderNav ? (
                <LayoutMenu
                  className="w-full"
                  menus={headerMenus}
                  defaultActive={headerActive}
                  rounded={isMenuRounded}
                  theme={headerTheme}
                  mode="horizontal"
                  onSelect={handleMenuSelect}
                />
              ) : null
            }
            slotGlobalSearch={globalSearch}
            slotThemeToggle={themeToggle}
            slotNotification={notification}
            slotUserDropdown={userDropdown}
            rightExtra={rightExtra}
            rightExtraIndex={rightExtraIndex}
            onClearPreferencesAndLogout={onClearPreferencesAndLogout}
          />
        }
        slotMenu={
          <LayoutMenu
            menus={sidebarMenus}
            defaultActive={sidebarActive}
            accordion={preferences.navigation.accordion}
            collapse={preferences.sidebar.collapsed}
            collapseShowTitle={preferences.sidebar.collapsedShowTitle}
            rounded={isMenuRounded}
            theme={sidebarTheme}
            mode="vertical"
            onSelect={handleMenuSelect}
            onOpen={handleMenuOpen}
          />
        }
        slotMixedMenu={
          layout.isSidebarMixedNav || layout.isHeaderMixedNav ? (
            <LayoutMixedMenu
              menus={mixHeaderMenus}
              activePath={extraActiveMenu}
              rounded={isMenuRounded}
              theme={sidebarTheme}
              onDefaultSelect={handleDefaultSelect}
              onSelect={handleMixedMenuSelect}
              onEnter={handleMenuMouseEnter}
            />
          ) : null
        }
        slotSideExtra={
          layout.isSidebarMixedNav || layout.isHeaderMixedNav ? (
            <LayoutExtraMenu
              menus={extraMenus}
              accordion={preferences.navigation.accordion}
              rounded={isMenuRounded}
              theme={sidebarThemeSub}
              collapse={preferences.sidebar.extraCollapse}
            />
          ) : null
        }
        slotSideExtraTitle={
          preferences.logo.enable ? (
            <Logo
              fit={preferences.logo.fit}
              text={preferences.app.name}
              theme={sidebarThemeSub}
              slotText={slotLogoText}
            />
          ) : null
        }
        slotTabbar={
          preferences.tabbar.enable ? (
            <LayoutTabbar
              showIcon={preferences.tabbar.showIcon}
              theme={isDark ? 'dark' : 'light'}
            />
          ) : null
        }
        slotContent={
          <LayoutContent layer={contentLayer}>
            <Outlet />
          </LayoutContent>
        }
        slotContentOverlay={
          preferences.transition.loading ? <LayoutContentSpinner /> : null
        }
        slotFooter={
          preferences.footer.enable ? (
            <LayoutFooter>
              {preferences.copyright.enable && (
                <Copyright
                  companyName={
                    preferences.copyright.companyName || systemName()
                  }
                  companySiteLink={preferences.copyright.companySiteLink}
                  date={preferences.copyright.date}
                  icp={preferences.copyright.icp}
                  icpLink={preferences.copyright.icpLink}
                />
              )}
            </LayoutFooter>
          ) : null
        }
        slotExtra={
          <>
            {extra}
            {preferences.app.enableCheckUpdates ? (
              <CheckUpdates
                checkUpdatesInterval={preferences.app.checkUpdatesInterval}
              />
            ) : null}
            <BackTop />
            {lockScreen}
          </>
        }
      />
      {showPreferencesFixed ? (
        <div className="fixed top-1/2 right-0 z-100 -translate-y-1/2 transform">
          <Preferences
            onClearPreferencesAndLogout={onClearPreferencesAndLogout}
          />
        </div>
      ) : null}
    </>
  );
}
