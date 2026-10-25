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

  /** header-right 自定义内容（等价参考实现 的 header-right-N 插槽） */
  rightExtra?: ReactNode;

  /** rightExtra 的排序索引（等价 header-right-N 插槽名中的 N） */
  rightExtraIndex?: number;

  /** Logo 文字插槽（等价参考实现 的 #logo-text，覆盖默认 app.name） */
  slotLogoText?: ReactNode;

  /** extra 区域自定义内容（等价参考实现 的 #extra —— 在 CheckUpdates/BackTop 之前渲染） */
  extra?: ReactNode;

  /**
   * 锁屏覆盖层（等价参考实现 的 #lock-screen 槽位 —— 在 extra 区域内以
   * 覆盖层渲染，由调用方控制显隐，layout/tab 状态保持挂载）。
   * React port 默认等价实现为独立 /lock 路由（见 App.tsx 注释）；
   * 需要保持布局挂载的场景可通过此 prop 注入覆盖层。
   */
  lockScreen?: ReactNode;

  /**
   * 常驻内容层（LayoutContent layer 槽位的透传）：渲染在内容区 keyed/过渡
   * 包装外层、不随路由切换重建。用于微前端容器等需要跨路由持久存在的
   * DOM（见 App.tsx contentLayer 注入与 spec microfrontend-guidelines）。
   */
  contentLayer?: ReactNode;

  /** 点击 Logo 回调（等价于 reference 的 clickLogo emit） */
  clickLogo?: () => void;

  /** 清空偏好并登出（等价于 reference 的 clearPreferencesAndLogout emit） */
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

  // layout 语义双轨（reference 同样如此）：
  // - useLayout（layout-ui 语义）→ LayoutCore 布局骨架
  // - useLayoutFromPreferences（preferences 语义，isMixedNav 仅 mixed-nav）
  //   → 本组件的 logo/breadcrumb/menu 门控（等价 layout.vue 的 usePreferences）
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
    // mixHeaderMenus 已由 useMixedMenu 从 withParents(menus) 全树派生（子树切片
    // 保留全树 parents，等价参考实现 generate-menus 数据），不再二次包装 ——
    // 二次 withParents 会把 parents 重置为子树相对层级，破坏 parents[1] 语义
  } = useExtraMenu({ menus: mixHeaderMenus, currentPath: location.pathname });

  const [sidebarExpandOnHovering, setSidebarExpandOnHovering] = useState(false);
  const isMenuRounded = preferences.navigation.styleType === 'rounded';
  const isDark = useLayoutStore((s) => s.isDark);
  const tabbarStoreRefresh = useTabbarStore((s) => s.refresh);
  const timezone = useTimezoneStore((s) => s.timezone);

  // 时区更新后刷新页面（layout.vue:215-218；locale 部分无 i18n 运行时不适用）。
  // refreshAll 等价：清空 cachedTabs + 刷新当前路由视图。
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

  // watch(layout)：sidebar-mixed-nav 下强制显示侧边栏（layout.vue:193-204）
  useEffect(() => {
    if (
      preferences.app.layout === 'sidebar-mixed-nav' &&
      preferences.sidebar.hidden
    ) {
      preferences.updatePreferences({ sidebar: { hidden: false } });
    }
  }, [preferences.app.layout, preferences.sidebar.hidden, preferences]);

  // onMounted → autoCollapseMenuByRouteMeta（layout.vue:174-187）：
  // 双列模式下当前路由 hideInMenu 时收起侧边额外面板
  useEffect(() => {
    if (
      (preferences.app.layout === 'header-mixed-nav' ||
        preferences.app.layout === 'sidebar-mixed-nav') &&
      getRouteMeta(location.pathname)?.hideInMenu
    ) {
      setSidebarExtraVisible(false);
    }
    // 仅挂载时执行（等价 onMounted）
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

  // logoClass（layout.vue:74-86）—— preferences 语义
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

  // logoCollapsed（layout.vue:93-103）—— preferences 语义
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

  // showHeaderNav（layout.vue:105-110）—— preferences 语义
  const showHeaderNav = useMemo(() => {
    return (
      !preferences.app.isMobile &&
      (prefsLayout.isHeaderNav ||
        prefsLayout.isMixedNav ||
        prefsLayout.isHeaderMixedNav)
    );
  }, [preferences.app.isMobile, prefsLayout]);

  // logoTheme（layout.vue:112-119）：logo 在 header 中显示时跟随 header 主题
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

        // 必须直传 store action（引用恒定），不能写成内联箭头 (c) => …：
        // 上游布局组件 里 `useEffect(() => { if (isMobile) onSetSidebarCollapsed(true) },
        // [isMobile, onSetSidebarCollapsed])` 把它当依赖 —— 内联箭头每次渲染都是新引用
        // → effect 每渲染重跑 → 写 store → 本组件（整店订阅）重渲染 → 又是新箭头 →
        // render→set→render 无限循环，React 19 直接抛 #185（Max update depth exceeded）。
        // 实测触发条件：app.isMobile 为 true（视口 ≤767.98px）时才进入写分支。
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
                  // 公司名未自定义（留空）时按当前语言取系统名，英文界面不显示中文名
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
            {/* #extra 插槽（layout.vue:422 —— 用户内容在 CheckUpdates 之前） */}
            {preferences.app.enableCheckUpdates ? (
              <CheckUpdates
                checkUpdatesInterval={preferences.app.checkUpdatesInterval}
              />
            ) : null}
            <BackTop />
            {/* #lock-screen 槽位（layout.vue:429-431 —— 覆盖层渲染，条件由调用方控制） */}
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
