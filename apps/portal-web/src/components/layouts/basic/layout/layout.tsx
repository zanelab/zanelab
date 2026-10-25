import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useLayout } from '../../hooks/use-layout';
import { AppIcon } from '../../../icons/app-icon';
import { LayoutSidebar } from '../sidebar';
import { LayoutHeaderCore } from '../header';
import { LayoutContentCore } from '../content';
import { LayoutFooterCore } from '../footer';
import { LayoutTabbarCore } from '../tabbar';
import type { LayoutCorePublicProps } from './types';

/** 等价于 reference 的 SCROLL_FIXED_CLASS（use-scroll-lock.ts，admin 前缀） */
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

  // Header auto mode
  const isHeaderAutoMode = headerMode === 'auto';

  // ── 滚动/自动隐藏 header（上游布局模板 useScroll + useMouse 等价实现）──
  // props 未传时由组件内部驱动
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

  // Header wrapper height
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

  // useScroll(document) 等价：scrollY 驱动 header 阴影与 marginTop；
  // auto-scroll 模式下按滚动方向（300ms 节流）隐藏/显示 header
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

  // useMouse 等价：auto 模式下鼠标在触发区（顶部 12px）或 header 区域内显示，
  // 否则隐藏（HEADER_TRIGGER_DISTANCE = 12）
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

  // watch(isMobile, immediate) → 移动端默认折叠侧边栏
  useEffect(() => {
    if (isMobile) onSetSidebarCollapsed(true);
  }, [isMobile, onSetSidebarCollapsed]);

  // Side collapse width
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

  // Sidebar enable state
  const sidebarEnableState = useMemo(() => {
    return !isHeaderNav && sidebarEnable;
  }, [isHeaderNav, sidebarEnable]);

  // Sidebar margin top
  const sidebarMarginTop = useMemo(() => {
    return isMixedNav && !isMobile ? headerHeight : 0;
  }, [isMixedNav, isMobile, headerHeight]);

  // Sidebar width
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

  // Sidebar extra width
  const sidebarExtraWidth = useMemo(() => {
    return sidebarExtraCollapse ? sidebarExtraCollapsedWidth : sidebarWidth;
  }, [sidebarExtraCollapse, sidebarExtraCollapsedWidth, sidebarWidth]);

  // Show sidebar
  const showSidebar = useMemo(() => {
    return isSideMode && sidebarEnable && !sidebarHidden;
  }, [isSideMode, sidebarEnable, sidebarHidden]);

  // Header fixed
  const headerFixed = useMemo(() => {
    return (
      isMixedNav ||
      headerMode === 'fixed' ||
      headerMode === 'auto-scroll' ||
      headerMode === 'auto'
    );
  }, [isMixedNav, headerMode]);

  // Mask visible
  const maskVisible = useMemo(() => {
    return !sidebarCollapsed && isMobile;
  }, [sidebarCollapsed, isMobile]);

  // Main style
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

  // Tabbar style
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

  // Content style
  // 用 padding-top 而非 margin-top（09-29）：margin 在盒子外，会被算进外层可滚动
  // 高度 → 内容不高也会多出滚动条；padding 在盒子内（border-box），由 flex:1
  // 吸收，不产生额外可滚动高度。固定头部/页脚的偏移量与内容 padding 合并。
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

  // Header z-index
  const headerZIndex = useMemo(() => {
    const offset = isMixedNav ? 1 : 0;
    return zIndex + offset;
  }, [zIndex, isMixedNav]);

  // Header wrapper style
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

  // Sidebar z-index
  const sidebarZIndex = useMemo(() => {
    let offset = isMobile || isSideMode ? 1 : -1;
    if (isMixedNav) offset += 1;
    return zIndex + offset;
  }, [isMobile, isSideMode, isMixedNav, zIndex]);

  // Footer width
  const footerWidth = useMemo(() => {
    if (!footerFixed) return '100%';
    return mainStyle.width;
  }, [footerFixed, mainStyle.width]);

  // Show header toggle button
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

  // Show header logo
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

  // Toggle button icon（原 strokeWidth 1.5，收拢统一为 2 —— 略粗可接受，已拍板）
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
