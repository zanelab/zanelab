export type LayoutMode =
  | 'sidebar-nav'
  | 'mixed-nav'
  | 'sidebar-mixed-nav'
  | 'header-nav'
  | 'full-content'
  | 'header-mixed-nav'
  | 'header-sidebar-nav';

export type HeaderMode = 'fixed' | 'auto' | 'auto-scroll' | 'static';

export type ContentCompact = 'wide' | 'compact';

export type NavigationStyleType = 'plain' | 'rounded';

export type BreadcrumbStyleType = 'background' | 'normal';

export type SidebarTheme = 'dark' | 'light';

export type BuiltinThemeType =
  | 'custom'
  | 'deep-blue'
  | 'deep-green'
  | 'default'
  | 'gray'
  | 'green'
  | 'neutral'
  | 'orange'
  | 'pink'
  | 'rose'
  | 'sky-blue'
  | 'slate'
  | 'violet'
  | 'yellow'
  | 'zinc';

export type AccessModeType = 'frontend' | 'backend' | 'mixed';

export type LoginExpiredModeType = 'modal' | 'page';

export type AuthPageLayoutType = 'panel-center' | 'panel-left' | 'panel-right';

export type LogoFitType = 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';

export interface LayoutCoreProps {
  layout: LayoutMode;

  isMobile: boolean;

  headerHeight: number;
  headerMode: HeaderMode;
  headerVisible: boolean;
  headerHidden: boolean;
  headerToggleSidebarButton: boolean;
  headerTheme: SidebarTheme;

  sidebarEnable: boolean;
  sidebarHidden: boolean;
  sidebarWidth: number;
  sideCollapseWidth: number;
  sidebarMixedWidth: number;
  sidebarExtraCollapsedWidth: number;
  sidebarTheme: SidebarTheme;
  sidebarThemeSub: SidebarTheme;
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

  children?: React.ReactNode;

  onToggleSidebar?: () => void;
  onSideMouseLeave?: () => void;
  onUpdateSidebarWidth?: (width: number) => void;
}
