import { useRef, useEffect, useCallback } from 'react';
import { Scrollbar } from '@zanelab/ui';
import { SidebarCollapseButton } from '../widgets/sidebar-collapse-button';
import { SidebarFixedButton } from '../widgets/sidebar-fixed-button';
import { useSidebarDrag } from '../hooks/use-sidebar-drag';

interface LayoutSidebarProps {
  width: number;
  collapseWidth: number;
  mixedWidth: number;
  extraWidth: number;
  headerHeight: number;
  collapseHeight?: number;
  marginTop?: number;
  paddingTop?: number;
  show: boolean;
  domVisible: boolean;
  theme: string;
  themeSub: string;
  isSidebarMixed: boolean;
  fixedExtra: boolean;
  showCollapseButton: boolean;
  showFixedButton: boolean;
  zIndex: number;
  collapsed: boolean;
  expandOnHover: boolean;
  expandOnHovering: boolean;
  extraCollapse: boolean;
  extraVisible: boolean;
  draggable: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onExpandOnHoverChange: (val: boolean) => void;
  onExpandOnHoveringChange: (val: boolean) => void;
  onExtraCollapseChange: (collapse: boolean) => void;
  onExtraVisibleChange: (visible: boolean) => void;
  onWidthChange: (width: number) => void;
  onMouseLeave: () => void;
  children?: React.ReactNode;
  slotLogo?: React.ReactNode;
  slotExtra?: React.ReactNode;
  slotExtraTitle?: React.ReactNode;
}

function calcMenuWidthStyle(
  width: number,
  isHiddenDom: boolean,
  isSidebarMixed: boolean,
  fixedExtra: boolean,
  extraVisible: boolean,
  extraWidth: number,
  expandOnHovering: boolean,
  expandOnHover: boolean,
  collapseWidth: number,
  mixedWidth: number,
  show: boolean,
): React.CSSProperties {
  let widthValue =
    width === 0
      ? '0px'
      : `${width + (isSidebarMixed && fixedExtra && extraVisible ? extraWidth : 0)}px`;

  if (isHiddenDom && expandOnHovering && !expandOnHover) {
    widthValue = isSidebarMixed ? `${mixedWidth}px` : `${collapseWidth}px`;
  }

  return {
    ...(widthValue === '0px' ? { overflow: 'hidden' } : {}),
    flex: `0 0 ${widthValue}`,
    marginLeft: show ? 0 : `-${widthValue}`,
    maxWidth: widthValue,
    minWidth: widthValue,
    width: widthValue,
  };
}

export function LayoutSidebar({
  width,
  collapseWidth,
  mixedWidth,
  extraWidth,
  headerHeight,
  collapseHeight = 42,
  marginTop = 0,
  paddingTop = 0,
  show,
  domVisible,
  theme,
  themeSub,
  isSidebarMixed,
  fixedExtra,
  showCollapseButton,
  showFixedButton,
  zIndex,
  collapsed,
  expandOnHover,
  expandOnHovering,
  extraCollapse,
  extraVisible,
  draggable,
  onCollapsedChange,
  onExpandOnHoverChange,
  onExpandOnHoveringChange,
  onExtraCollapseChange,
  onExtraVisibleChange,
  onWidthChange,
  onMouseLeave,
  children,
  slotLogo,
  slotExtra,
  slotExtraTitle,
}: LayoutSidebarProps) {
  const asideRef = useRef<HTMLElement>(null);
  const dragBarRef = useRef<HTMLDivElement>(null);
  const { startDrag, endDrag } = useSidebarDrag();

  // useScrollLock(document.body) 等价：sidebar-mixed 悬停展开时锁定 body 滚动
  const lockedRef = useRef(false);
  const savedOverflowRef = useRef('');

  /** 等价于 reference 的 SCROLL_FIXED_CLASS（`_scroll__fixed_`，admin 前缀） */
  const SCROLL_FIXED_CLASS = '__admin_scroll_fixed__';

  /** 等价于 上游 shared 工具包 的 getScrollbarWidth */
  function getScrollbarWidth(): number {
    if (typeof document === 'undefined') return 0;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    return Math.max(scrollbarWidth, 0);
  }

  /** 等价于 上游 shared 工具包 的 needsScrollbar */
  function needsScrollbar(): boolean {
    return document.body.scrollHeight > window.innerHeight;
  }

  const setBodyLocked = useCallback((val: boolean) => {
    if (lockedRef.current === val) return;
    lockedRef.current = val;
    if (val) {
      if (!needsScrollbar()) {
        return;
      }
      const scrollbarWidth = getScrollbarWidth();
      savedOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      // reference use-scroll-lock.ts —— body 加 paddingRight，
      // 并对所有 SCROLL_FIXED_CLASS 固定节点补偿 paddingRight（禁用过渡）
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document
        .querySelectorAll<HTMLElement>(`.${SCROLL_FIXED_CLASS}`)
        .forEach((node) => {
          node.dataset.transition = node.style.transition;
          node.style.transition = 'none';
          node.style.paddingRight = `${scrollbarWidth}px`;
        });
    } else {
      document.body.style.overflow = savedOverflowRef.current;
      document.body.style.paddingRight = '';
      document
        .querySelectorAll<HTMLElement>(`.${SCROLL_FIXED_CLASS}`)
        .forEach((node) => {
          node.style.paddingRight = '';
          const saved = node.dataset.transition || '';
          requestAnimationFrame(() => {
            node.style.transition = saved;
          });
        });
    }
  }, []);

  // 卸载时解锁，避免残留 overflow: hidden
  useEffect(() => {
    return () => setBodyLocked(false);
  }, [setBodyLocked]);

  useEffect(() => {
    if (fixedExtra) {
      onExtraVisibleChange(true);
    }
  }, [fixedExtra, onExtraVisibleChange]);

  useEffect(() => {
    return () => endDrag();
  }, [endDrag]);

  const hiddenSideStyle = calcMenuWidthStyle(
    width,
    true,
    isSidebarMixed,
    fixedExtra,
    extraVisible,
    extraWidth,
    expandOnHovering,
    expandOnHover,
    collapseWidth,
    mixedWidth,
    show,
  );

  const style: React.CSSProperties = {
    '--scroll-shadow': 'var(--sidebar)',
    ...calcMenuWidthStyle(
      width,
      false,
      isSidebarMixed,
      fixedExtra,
      extraVisible,
      extraWidth,
      expandOnHovering,
      expandOnHover,
      collapseWidth,
      mixedWidth,
      show,
    ),
    height: `calc(100% - ${marginTop}px)`,
    marginTop: `${marginTop}px`,
    paddingTop: `${paddingTop}px`,
    zIndex: zIndex != null && !isNaN(zIndex) ? zIndex : undefined,
    ...(isSidebarMixed && extraVisible ? { transition: 'none' } : {}),
  } as React.CSSProperties;

  const extraStyle: React.CSSProperties = {
    left: `${width}px`,
    width: extraVisible && show ? `${extraWidth}px` : 0,
    zIndex: zIndex != null && !isNaN(zIndex) ? zIndex : undefined,
  };

  const extraTitleStyle: React.CSSProperties = {
    height: `${headerHeight - 1}px`,
  };

  const contentWidthStyle: React.CSSProperties =
    isSidebarMixed && fixedExtra ? { width: `${mixedWidth}px` } : {};

  const headerStyle: React.CSSProperties = {
    ...(isSidebarMixed ? { display: 'flex', justifyContent: 'center' } : {}),
    height: `${headerHeight - 1}px`,
    ...contentWidthStyle,
  };

  const contentStyle: React.CSSProperties = {
    height: `calc(100% - ${headerHeight + collapseHeight}px)`,
    paddingTop: '8px',
    ...contentWidthStyle,
  };

  const collapseStyle: React.CSSProperties = {
    height: `${collapseHeight}px`,
  };

  const extraContentStyle: React.CSSProperties = {
    height: `calc(100% - ${headerHeight + collapseHeight}px)`,
  };

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      // offsetX 相对 <aside> 计算（React mouseenter 冒泡自子元素，
      // nativeEvent.offsetX 是相对触发子元素的 —— 等价于 reference 的 e?.offsetX）
      const aside = asideRef.current;
      const offsetX = aside
        ? e.clientX - aside.getBoundingClientRect().left
        : e.nativeEvent.offsetX;
      if (offsetX < 10) return;
      if (expandOnHover) return;
      if (!expandOnHovering) {
        onCollapsedChange(false);
      }
      if (isSidebarMixed) {
        setBodyLocked(true);
      }
      onExpandOnHoveringChange(true);
    },
    [
      expandOnHover,
      expandOnHovering,
      isSidebarMixed,
      onCollapsedChange,
      onExpandOnHoveringChange,
      setBodyLocked,
    ],
  );

  const handleMouseLeave = useCallback(() => {
    onMouseLeave();
    if (isSidebarMixed) {
      setBodyLocked(false);
    }
    if (expandOnHover) return;
    onExpandOnHoveringChange(false);
    onCollapsedChange(true);
    onExtraVisibleChange(false);
  }, [
    expandOnHover,
    isSidebarMixed,
    onMouseLeave,
    onExpandOnHoveringChange,
    onCollapsedChange,
    onExtraVisibleChange,
    setBodyLocked,
  ]);

  const handleDragSidebar = useCallback(
    (e: React.MouseEvent) => {
      const minLimit = isSidebarMixed ? width + collapseWidth : collapseWidth;
      const maxLimit = isSidebarMixed ? width + 320 : 320;

      startDrag(
        e.nativeEvent,
        { min: minLimit, max: maxLimit },
        { target: asideRef.current, dragBar: dragBarRef.current },
        (newWidth) => {
          if (isSidebarMixed) {
            onWidthChange(newWidth - width);
            onExtraCollapseChange(newWidth - width <= collapseWidth);
            onCollapsedChange(newWidth - width <= collapseWidth);
          } else {
            onWidthChange(newWidth);
            onCollapsedChange(newWidth <= collapseWidth);
            onExtraCollapseChange(newWidth <= collapseWidth);
          }
        },
      );
    },
    [
      width,
      collapseWidth,
      isSidebarMixed,
      startDrag,
      onWidthChange,
      onExtraCollapseChange,
      onCollapsedChange,
    ],
  );

  return (
    <>
      {domVisible && (
        <div
          className={`h-full transition-all duration-150 ${theme}`}
          style={hiddenSideStyle}
        />
      )}
      <aside
        ref={asideRef}
        className={`fixed top-0 left-0 h-full transition-all duration-150 ${theme}`}
        style={style}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className={`h-full ${
            isSidebarMixed
              ? 'bg-sidebar-deep'
              : 'border-border bg-sidebar border-r'
          }`}
          style={{ width: `${width}px` }}
        >
          {!collapsed && !isSidebarMixed && showFixedButton && (
            <SidebarFixedButton
              expandOnHover={expandOnHover}
              onExpandOnHoverChange={onExpandOnHoverChange}
            />
          )}

          {slotLogo && <div style={headerStyle}>{slotLogo}</div>}

          {/* admin-scrollbar--hover：左侧菜单滚动条改为「鼠标移入/键盘聚焦才显色」，
              槽位仍常驻（scrollbar-gutter: stable 未撤）→ 显隐不挤动菜单宽度 */}
          <Scrollbar
            style={contentStyle}
            className="admin-scrollbar--hover"
            shadow
            shadowBorder
          >
            {children}
          </Scrollbar>

          <div style={collapseStyle} />
          {showCollapseButton && !isSidebarMixed && (
            <SidebarCollapseButton
              collapsed={collapsed}
              onCollapsedChange={onCollapsedChange}
            />
          )}
        </div>

        {isSidebarMixed && (
          <div
            className={`border-border bg-sidebar fixed top-0 h-full overflow-hidden border-r transition-all duration-200 ${themeSub} ${extraVisible ? 'border-l' : ''}`}
            style={extraStyle}
          >
            {isSidebarMixed && expandOnHover && (
              <SidebarCollapseButton
                collapsed={extraCollapse}
                onCollapsedChange={onExtraCollapseChange}
              />
            )}

            {!extraCollapse && (
              <SidebarFixedButton
                expandOnHover={expandOnHover}
                onExpandOnHoverChange={onExpandOnHoverChange}
              />
            )}

            {!extraCollapse && (
              <div className="pl-2" style={extraTitleStyle}>
                {slotExtraTitle}
              </div>
            )}

            <Scrollbar
              style={extraContentStyle}
              className="admin-scrollbar--hover border-border py-2"
              shadow
              shadowBorder
            >
              {slotExtra}
            </Scrollbar>
          </div>
        )}

        {draggable && (
          <div
            ref={dragBarRef}
            className="hover:bg-primary absolute inset-y-0 -right-px z-1000 w-0.5 cursor-col-resize"
            onMouseDown={handleDragSidebar}
          />
        )}
      </aside>
    </>
  );
}
