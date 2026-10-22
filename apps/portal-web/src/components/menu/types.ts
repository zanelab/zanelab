export interface MenuProps {
  accordion?: boolean;
  collapse?: boolean;
  collapseShowTitle?: boolean;
  defaultActive?: string;
  defaultOpeneds?: string[];
  mode?: 'horizontal' | 'vertical';
  rounded?: boolean;
  scrollToActive?: boolean;
  theme?: 'dark' | 'light';
}

export interface SubMenuProps {
  path: string;
  icon?: string | React.ReactNode;
  activeIcon?: string | React.ReactNode;
  disabled?: boolean;

  isMenuMore?: boolean;

  activeOverride?: boolean;
  badge?: string | number;
  badgeType?: 'dot' | string;
  badgeVariants?:
    | 'default'
    | 'destructive'
    | 'primary'
    | 'success'
    | 'warning'
    | (string & {});
  children?: React.ReactNode;
  title?: React.ReactNode;
}

export interface MenuItemProps {
  path: string;
  icon?: string | React.ReactNode;
  activeIcon?: string | React.ReactNode;
  disabled?: boolean;
  badge?: string | number;
  badgeType?: 'dot' | string;
  badgeVariants?:
    | 'default'
    | 'destructive'
    | 'primary'
    | 'success'
    | 'warning'
    | (string & {});
  query?: Record<string, unknown>;
  children?: React.ReactNode;
  title?: React.ReactNode;
}

export interface MenuItemRegistered {
  active: boolean;
  parentPaths: string[];
  path: string;
  query?: Record<string, unknown>;
}

export interface MenuItemClicked {
  parentPaths: string[];
  path: string;
  query?: Record<string, unknown>;
}

export interface MenuContextValue {
  activePath: string;
  openedMenus: string[];
  isMenuPopup: boolean;
  theme: string;
  mode: 'horizontal' | 'vertical';
  collapse: boolean;
  collapseShowTitle: boolean;
  rounded: boolean;
  items: Record<string, MenuItemRegistered>;
  subMenus: Record<string, MenuItemRegistered>;
  handleMenuItemClick: (data: MenuItemClicked) => void;
  handleSubMenuClick: (data: MenuItemRegistered) => void;
  openMenu: (path: string, parentPaths: string[]) => void;
  closeMenu: (path: string, parentPaths: string[]) => void;
  addMenuItem: (item: MenuItemRegistered) => void;
  removeMenuItem: (item: MenuItemRegistered) => void;
  addSubMenu: (item: MenuItemRegistered) => void;
  removeSubMenu: (item: MenuItemRegistered) => void;
}

export interface SubMenuContextValue {
  level: number;
  parentPaths: string[];

  mouseInChild?: { current: boolean };

  handleMouseleave?: (deepDispatch?: boolean) => void;
  addSubMenu: (item: MenuItemRegistered) => void;
  removeSubMenu: (item: MenuItemRegistered) => void;
}
