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

  /** active 覆盖：由 Menu 为 "更多" 触发器计算（聚合被切走项的激活
      状态，等价 reference sub-menu.vue:76-91 的注册表聚合）；未传时
      走 activePath 前缀匹配 */
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

  /** 子级悬停状态（等价 reference subMenu.mouseInChild ref ——
      子级 mouseenter/leave 时写父级的该标志，父级 leave 的 300ms
      定时器据其决定是否关闭） */
  mouseInChild?: { current: boolean };

  /** 向父级派发 leave（等价 reference handleMouseleave deepDispatch） */
  handleMouseleave?: (deepDispatch?: boolean) => void;
  addSubMenu: (item: MenuItemRegistered) => void;
  removeSubMenu: (item: MenuItemRegistered) => void;
}
