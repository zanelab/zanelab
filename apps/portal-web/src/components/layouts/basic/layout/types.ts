import type { ContentCompact } from '@zanelab/types';

/** 等价于 上游布局模板 的 上游布局组件Props */
export type AdminLayoutProps = LayoutCorePublicProps;

export interface LayoutCorePublicProps {
  layout:
    | 'sidebar-nav'
    | 'mixed-nav'
    | 'sidebar-mixed-nav'
    | 'header-nav'
    | 'full-content'
    | 'header-mixed-nav'
    | 'header-sidebar-nav';
  isMobile: boolean;
  headerHeight: number;
  headerMode: 'fixed' | 'auto' | 'auto-scroll' | 'static';
  headerVisible: boolean;
  headerHidden: boolean;
  headerToggleSidebarButton: boolean;
  headerTheme: 'dark' | 'light';
  sidebarEnable: boolean;
  sidebarHidden: boolean;
  sidebarWidth: number;
  sideCollapseWidth: number;
  sidebarMixedWidth: number;
  sidebarExtraCollapsedWidth: number;
  sidebarTheme: 'dark' | 'light';
  sidebarThemeSub: 'dark' | 'light';
  sidebarCollapsedButton: boolean;
  sidebarFixedButton: boolean;
  sidebarCollapseShowTitle: boolean;
  tabbarEnable: boolean;
  tabbarHeight: number;
  footerEnable: boolean;
  footerFixed: boolean;
  footerHeight: number;
  contentCompact: ContentCompact;
  contentCompactWidth: number;
  contentPadding: number;
  contentPaddingTop: number;
  contentPaddingBottom: number;
  contentPaddingLeft: number;
  contentPaddingRight: number;
  zIndex: number;
  sidebarCollapsed: boolean;
  sidebarExpandOnHover: boolean;
  sidebarExpandOnHovering: boolean;
  sidebarExtraVisible: boolean;
  sidebarExtraCollapse: boolean;
  sidebarDraggable: boolean;
  /** 未传时由组件内部滚动监听驱动（等价于 上游布局模板 的 useScroll(document)） */
  headerIsHidden?: boolean;
  scrollY?: number;
  onToggleSidebar: () => void;
  onSideMouseLeave: () => void;
  onUpdateSidebarWidth: (width: number) => void;
  onUpdateSidebarExpandOnHover: (val: boolean) => void;
  onClickMask: () => void;
  onSetSidebarCollapsed: (collapsed: boolean) => void;
  onSetSidebarExpandOnHovering: (val: boolean) => void;
  onSetSidebarExtraVisible: (visible: boolean) => void;
  onSetSidebarExtraCollapse: (collapse: boolean) => void;
  onSetHeaderIsHidden?: (hidden: boolean) => void;

  /** Slots via React children */
  children?: React.ReactNode;
  slotLogo?: React.ReactNode;
  slotMixedMenu?: React.ReactNode;
  slotMenu?: React.ReactNode;
  slotSideExtra?: React.ReactNode;
  slotSideExtraTitle?: React.ReactNode;
  slotHeader?: React.ReactNode;
  slotTabbar?: React.ReactNode;
  slotContent?: React.ReactNode;
  slotContentOverlay?: React.ReactNode;
  slotFooter?: React.ReactNode;
  slotExtra?: React.ReactNode;
}
