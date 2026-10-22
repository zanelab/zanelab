import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useLayout } from '../../hooks/use-layout';
import { AppIcon } from '../../../icons/app-icon';
import { LayoutSidebar } from '../sidebar';
import { LayoutHeaderCore } from '../header';
import { LayoutContentCore } from '../content';
import { LayoutFooterCore } from '../footer';
import { LayoutTabbarCore } from '../tabbar';
import type { LayoutCorePublicProps } from './types';

const SCROLL_FIXED_CLASS = '__admin_scroll_fixed__';

export function LayoutCore({
  layout,
  isMobile,
  headerHeight,
  headerMode,
  headerVisible,
  headerHidden,
  headerToggleSidebarButton,
  headerTheme,
  sidebarEnable,
  sidebarHidden,
  sidebarWidth,
  sideCollapseWidth,
  sidebarMixedWidth,
  sidebarExtraCollapsedWidth,
  sidebarTheme,
  sidebarThemeSub,
  sidebarCollapsedButton,
  sidebarFixedButton,
  sidebarCollapseShowTitle,
  tabbarEnable,
  tabbarHeight,
  footerEnable,
  footerFixed,
  footerHeight,
  contentCompact,
  contentCompactWidth,
  contentPadding,
  contentPaddingTop,
  contentPaddingBottom,
  contentPaddingLeft,
  contentPaddingRight,
  zIndex,
  sidebarCollapsed,
  sidebarExpandOnHover,
  sidebarExpandOnHovering,
  sidebarExtraVisible,
  sidebarExtraCollapse,
  sidebarDraggable,
  headerIsHidden: headerIsHiddenProp,
  scrollY: scrollYProp,
  onToggleSidebar,
  onSideMouseLeave,
  onUpdateSidebarWidth,
  onUpdateSidebarExpandOnHover,
  onClickMask,
  onSetSidebarCollapsed,
  onSetSidebarExpandOnHovering,
  onSetSidebarExtraVisible,
  onSetSidebarExtraCollapse,
  onSetHeaderIsHidden: onSetHeaderIsHiddenProp,
  children: _children,
  slotLogo,
  slotMixedMenu,
  slotMenu,
  slotSideExtra,
  slotSideExtraTitle,
  slotHeader,
  slotTabbar,
  slotContent,
  slotContentOverlay,
  slotFooter,
  slotExtra,
}: LayoutCorePublicProps) {
  const {
    isFullContent,
    isHeaderNav,
    isMixedNav,
    isSidebarMixedNav,
    isHeaderMixedNav,
    isSideMode,
  } = useLayout(layout, isMobile);

  const isHeaderAutoMode = headerMode === 'auto';

  const [internalScrollY, setInternalScrollY] = useState(0);
  const [internalHeaderIsHidden, setInternalHeaderIsHidden] = useState(false);
  const scrollY = scrollYProp ?? internalScrollY;
  const headerIsHidden = headerIsHiddenProp ?? internalHeaderIsHidden;

  const setHeaderIsHidden = useCallback(
    (val: boolean) => {
      setInternalHeaderIsHidden(val);
      onSetHeaderIsHiddenProp?.(val);
    },
    [onSetHeaderIsHiddenProp],
  );

  const headerWrapperHeight = useMemo(() => {
    let h = 0;
    if (headerVisible && !headerHidden) {
      h += headerHeight;
    }
    if (tabbarEnable) {
      h += tabbarHeight;
    }
    return h;
  }, [headerVisible, headerHidden, headerHeight, tabbarEnable, tabbarHeight]);

  useEffect(() => {
    if (scrollYProp !== undefined) return;
    let lastY = window.scrollY;
    let lastCheck = 0;
    function onScroll() {
      const y = window.scrollY;
      const direction = y < lastY ? 'up' : y > lastY ? 'down' : '';
      lastY = y;
      setInternalScrollY(y);
      if (headerMode !== 'auto-scroll' || isMixedNav || isFullContent) return;
      const now = Date.now();
      if (now - lastCheck < 300) return;
      lastCheck = now;
      if (y < headerWrapperHeight || y === 0) {
        setHeaderIsHidden(false);
        return;
      }
      if (direction === 'up') setHeaderIsHidden(false);
      else if (direction === 'down') setHeaderIsHidden(true);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [
    scrollYProp,
    headerMode,
    isMixedNav,
    isFullContent,
    headerWrapperHeight,
    setHeaderIsHidden,
  ]);

  const HEADER_TRIGGER_DISTANCE = 12;
  const mouseYRef = useRef(-1);
  useEffect(() => {
    if (headerMode !== 'auto' || isMixedNav || isFullContent) {
      if (headerMode !== 'auto-scroll') setHeaderIsHidden(false);
      return;
    }
    function check(e?: MouseEvent) {
      const mouseY = e ? e.clientY : mouseYRef.current;
      if (mouseY < 0) return;
      setInternalHeaderIsHidden((prev) => {
        const isInTriggerZone = mouseY <= HEADER_TRIGGER_DISTANCE;
        const isInHeaderZone = !prev && mouseY <= headerWrapperHeight;
        return !(isInTriggerZone || isInHeaderZone);
      });
    }
    function onMouseMove(e: MouseEvent) {
      mouseYRef.current = e.clientY;
      check(e);
    }
    window.addEventListener('mousemove', onMouseMove);
    check();
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [headerMode, isMixedNav, isFullContent, headerWrapperHeight]);

  useEffect(() => {
    if (isMobile) onSetSidebarCollapsed(true);
  }, [isMobile, onSetSidebarCollapsed]);

  const getSideCollapseWidth = useMemo(() => {
    return sidebarCollapseShowTitle || isSidebarMixedNav || isHeaderMixedNav
      ? sidebarExtraCollapsedWidth
      : sideCollapseWidth;
  }, [
    sidebarCollapseShowTitle,
    isSidebarMixedNav,
    isHeaderMixedNav,
    sidebarExtraCollapsedWidth,
    sideCollapseWidth,
  ]);

  const sidebarEnableState = useMemo(() => {
    return !isHeaderNav && sidebarEnable;
  }, [isHeaderNav, sidebarEnable]);

  const sidebarMarginTop = useMemo(() => {
    return isMixedNav && !isMobile ? headerHeight : 0;
  }, [isMixedNav, isMobile, headerHeight]);

  const getSidebarWidth = useMemo(() => {
    let w = 0;
    if (sidebarHidden) return w;

    if (
      !sidebarEnableState ||
      (sidebarHidden && !isSidebarMixedNav && !isMixedNav && !isHeaderMixedNav)
    ) {
      return w;
    }

    if ((isHeaderMixedNav || isSidebarMixedNav) && !isMobile) {
      w = sidebarMixedWidth;
    } else if (sidebarCollapsed) {
      w = isMobile ? 0 : getSideCollapseWidth;
    } else {
      w = sidebarWidth;
    }
    return w;
  }, [
    sidebarHidden,
    sidebarEnableState,
    isSidebarMixedNav,
    isMixedNav,
    isHeaderMixedNav,
    isMobile,
    sidebarMixedWidth,
    sidebarCollapsed,
    getSideCollapseWidth,
    sidebarWidth,
  ]);

  const sidebarExtraWidth = useMemo(() => {
    return sidebarExtraCollapse ? sidebarExtraCollapsedWidth : sidebarWidth;
  }, [sidebarExtraCollapse, sidebarExtraCollapsedWidth, sidebarWidth]);

  const showSidebar = useMemo(() => {
    return isSideMode && sidebarEnable && !sidebarHidden;
  }, [isSideMode, sidebarEnable, sidebarHidden]);

  const headerFixed = useMemo(() => {
    return (
      isMixedNav ||
      headerMode === 'fixed' ||
      headerMode === 'auto-scroll' ||
      headerMode === 'auto'
    );
  }, [isMixedNav, headerMode]);

  const maskVisible = useMemo(() => {
    return !sidebarCollapsed && isMobile;
  }, [sidebarCollapsed, isMobile]);

  const mainStyle = useMemo(() => {
    let width = '100%';
    let sidebarAndExtraWidth = 'unset';

    if (
      headerFixed &&
      layout !== 'header-nav' &&
      layout !== 'mixed-nav' &&
      layout !== 'header-sidebar-nav' &&
      showSidebar &&
      !isMobile
    ) {
      const isSideNavEffective =
        (isSidebarMixedNav || isHeaderMixedNav) &&
        sidebarExpandOnHover &&
        sidebarExtraVisible;

      if (isSideNavEffective) {
        const sideW = sidebarExtraCollapse
          ? sidebarExtraCollapsedWidth
          : sidebarWidth;
        sidebarAndExtraWidth = `${sidebarMixedWidth + sideW}px`;
        width = `calc(100% - ${sidebarAndExtraWidth})`;
      } else {
        let sbWidth = getSidebarWidth;
        if (sidebarExpandOnHovering && !sidebarExpandOnHover) {
          sbWidth =
            isSidebarMixedNav || isHeaderMixedNav
              ? sidebarMixedWidth
              : getSideCollapseWidth;
        }
        sidebarAndExtraWidth = `${sbWidth}px`;
        width = `calc(100% - ${sidebarAndExtraWidth})`;
      }
    }

    return { sidebarAndExtraWidth, width };
  }, [
    headerFixed,
    layout,
    showSidebar,
    isMobile,
    isSidebarMixedNav,
    isHeaderMixedNav,
    sidebarExpandOnHover,
    sidebarExtraVisible,
    sidebarExtraCollapse,
    sidebarExtraCollapsedWidth,
    sidebarWidth,
    sidebarExpandOnHovering,
    getSidebarWidth,
    sidebarMixedWidth,
    getSideCollapseWidth,
  ]);

  const tabbarStyle = useMemo((): React.CSSProperties => {
    let width: string;
    let marginLeft = 0;

    if (!isMixedNav || sidebarHidden) {
      width = '100%';
    } else if (sidebarEnable) {
      const onHoveringWidth = sidebarExpandOnHover
        ? sidebarWidth
        : getSideCollapseWidth;

      marginLeft = sidebarCollapsed ? getSideCollapseWidth : onHoveringWidth;

      width = `calc(100% - ${sidebarCollapsed ? getSidebarWidth : onHoveringWidth}px)`;
    } else {
      width = '100%';
    }

    return { marginLeft: `${marginLeft}px`, width };
  }, [
    isMixedNav,
    sidebarHidden,
    sidebarEnable,
    sidebarExpandOnHover,
    sidebarWidth,
    getSideCollapseWidth,
    sidebarCollapsed,
    getSidebarWidth,
  ]);

  const contentStyle = useMemo((): React.CSSProperties => {
    const headerOffset =
      headerFixed &&
      !isFullContent &&
      !headerIsHidden &&
      (!isHeaderAutoMode || scrollY < headerWrapperHeight)
        ? headerWrapperHeight
        : 0;
    const footerOffset = footerEnable && footerFixed ? footerHeight : 0;
    return {
      paddingTop: `${headerOffset + contentPaddingTop}px`,
      paddingBottom: `${footerOffset + contentPaddingBottom}px`,
    };
  }, [
    headerFixed,
    isFullContent,
    headerIsHidden,
    isHeaderAutoMode,
    scrollY,
    headerWrapperHeight,
    footerEnable,
    footerFixed,
    footerHeight,
    contentPaddingTop,
    contentPaddingBottom,
  ]);

  const headerZIndex = useMemo(() => {
    const offset = isMixedNav ? 1 : 0;
    return zIndex + offset;
  }, [zIndex, isMixedNav]);

  const headerWrapperStyle = useMemo((): React.CSSProperties => {
    return {
      height: isFullContent ? '0' : `${headerWrapperHeight}px`,
      left: isMixedNav ? 0 : mainStyle.sidebarAndExtraWidth,
      position: headerFixed ? 'fixed' : 'static',
      top: headerIsHidden || isFullContent ? `-${headerWrapperHeight}px` : 0,
      width: mainStyle.width,
      zIndex: headerZIndex,
    };
  }, [
    isFullContent,
    headerWrapperHeight,
    isMixedNav,
    mainStyle,
    headerFixed,
    headerIsHidden,
    headerZIndex,
  ]);

  const sidebarZIndex = useMemo(() => {
    let offset = isMobile || isSideMode ? 1 : -1;
    if (isMixedNav) offset += 1;
    return zIndex + offset;
  }, [isMobile, isSideMode, isMixedNav, zIndex]);

  const footerWidth = useMemo(() => {
    if (!footerFixed) return '100%';
    return mainStyle.width;
  }, [footerFixed, mainStyle.width]);

  const showHeaderToggleButton = useMemo(() => {
    return (
      isMobile ||
      (headerToggleSidebarButton &&
        isSideMode &&
        !isSidebarMixedNav &&
        !isMixedNav &&
        !isMobile)
    );
  }, [
    isMobile,
    headerToggleSidebarButton,
    isSideMode,
    isSidebarMixedNav,
    isMixedNav,
  ]);

  const showHeaderLogo = useMemo(() => {
    return !isSideMode || isMixedNav || isMobile;
  }, [isSideMode, isMixedNav, isMobile]);

  const handleHeaderToggle = useCallback(() => {
    if (isMobile) {
      onSetSidebarCollapsed(false);
    } else {
      onToggleSidebar();
    }
  }, [isMobile, onSetSidebarCollapsed, onToggleSidebar]);

  const maskStyle: React.CSSProperties = {
    zIndex,
  };

  const toggleIcon = showSidebar ? (
    <AppIcon name="layout-sidebar-collapse" className="size-5" />
  ) : (
    <AppIcon name="layout-sidebar-expand" className="size-5" />
  );

  return (
    <div className="relative flex min-h-full w-full">
      {sidebarEnableState && (
        <LayoutSidebar
          width={getSidebarWidth}
          collapseWidth={getSideCollapseWidth}
          mixedWidth={sidebarMixedWidth}
          extraWidth={sidebarExtraWidth}
          headerHeight={isMixedNav ? 0 : headerHeight}
          marginTop={sidebarMarginTop}
          show={showSidebar}
          domVisible={!isMobile}
          theme={sidebarTheme}
          themeSub={sidebarThemeSub}
          isSidebarMixed={isSidebarMixedNav || isHeaderMixedNav}
          fixedExtra={sidebarExpandOnHover}
          showCollapseButton={sidebarCollapsedButton}
          showFixedButton={sidebarFixedButton}
          zIndex={sidebarZIndex}
          collapsed={sidebarCollapsed}
          expandOnHover={sidebarExpandOnHover}
          expandOnHovering={sidebarExpandOnHovering}
          extraCollapse={sidebarExtraCollapse}
          extraVisible={sidebarExtraVisible}
          draggable={sidebarDraggable}
          onCollapsedChange={onSetSidebarCollapsed}
          onExpandOnHoverChange={onUpdateSidebarExpandOnHover}
          onExpandOnHoveringChange={onSetSidebarExpandOnHovering}
          onExtraCollapseChange={onSetSidebarExtraCollapse}
          onExtraVisibleChange={onSetSidebarExtraVisible}
          onWidthChange={onUpdateSidebarWidth}
          onMouseLeave={onSideMouseLeave}
          slotLogo={isSideMode && !isMixedNav ? slotLogo : undefined}
          slotExtra={slotSideExtra}
          slotExtraTitle={slotSideExtraTitle}
        >
          {isSidebarMixedNav || isHeaderMixedNav ? slotMixedMenu : slotMenu}
        </LayoutSidebar>
      )}

      <div className="flex flex-1 flex-col overflow-hidden transition-all duration-300 ease-in">
        <div
          className={`overflow-hidden transition-all duration-200 ${SCROLL_FIXED_CLASS} ${scrollY > 20 ? 'shadow-[0_16px_24px_hsl(var(--background))]' : ''}`}
          style={headerWrapperStyle}
        >
          {headerVisible && (
            <LayoutHeaderCore
              fullWidth={!isSideMode}
              height={headerHeight}
              isMobile={isMobile}
              show={!isFullContent && !headerHidden}
              sidebarWidth={sidebarWidth}
              theme={headerTheme}
              width={mainStyle.width}
              zIndex={headerZIndex}
              slotToggleButton={
                showHeaderToggleButton ? (
                  <button
                    className="btn btn-ghost btn-sm my-0 mr-1"
                    onClick={handleHeaderToggle}
                  >
                    {toggleIcon}
                  </button>
                ) : undefined
              }
              slotLogo={showHeaderLogo ? slotLogo : undefined}
            >
              {slotHeader}
            </LayoutHeaderCore>
          )}

          {tabbarEnable && (
            <LayoutTabbarCore height={tabbarHeight} style={tabbarStyle}>
              {slotTabbar}
            </LayoutTabbarCore>
          )}
        </div>

        <LayoutContentCore
          id="__admin_main_content"
          contentCompact={contentCompact}
          contentCompactWidth={contentCompactWidth}
          padding={contentPadding}
          paddingTop={contentPaddingTop}
          paddingBottom={contentPaddingBottom}
          paddingLeft={contentPaddingLeft}
          paddingRight={contentPaddingRight}
          style={contentStyle}
          className="transition-[padding-top] duration-200"
          slotOverlay={slotContentOverlay}
        >
          {slotContent}
        </LayoutContentCore>

        <LayoutFooterCore
          fixed={footerFixed}
          height={footerHeight}
          show={!isFullContent && footerEnable}
          width={footerWidth}
          zIndex={zIndex}
        >
          {slotFooter}
        </LayoutFooterCore>
      </div>

      {slotExtra}

      {maskVisible && (
        <div
          className="bg-overlay fixed top-0 left-0 size-full transition-[background-color] duration-200"
          style={maskStyle}
          onClick={onClickMask}
        />
      )}
    </div>
  );
}
