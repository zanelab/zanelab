import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { MenuContext, SubMenuContext, createSubMenuContext } from './context';
import type { MenuItemClicked, MenuItemRegistered, MenuProps } from './types';
import type { MenuRecordRaw } from '@zanelab/types';
import { MenuItem } from './menu-item';
import { SubMenu } from './sub-menu';

interface MenuViewProps extends MenuProps {
  menus?: MenuRecordRaw[];
  className?: string;
  onSelect?: (path: string, parentPaths: string[]) => void;
  onOpen?: (path: string, parentPaths: string[]) => void;
  onClose?: (path: string, parentPaths: string[]) => void;
}

const EllipsisIcon = () => (
  <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

export function Menu({
  accordion = true,
  className,
  collapse = false,
  collapseShowTitle = false,
  defaultActive = '',
  defaultOpeneds = [],
  mode = 'vertical',
  rounded = true,
  scrollToActive = false,
  theme = 'dark',
  menus = [],
  onSelect,
  onOpen,
  onClose,
}: MenuViewProps) {
  const [activePath, setActivePath] = useState(defaultActive);
  const [openedMenus, setOpenedMenus] = useState<string[]>(
    collapse ? [] : defaultOpeneds,
  );
  const itemsRef = useRef<Record<string, MenuItemRegistered>>({});
  const subMenusRef = useRef<Record<string, MenuItemRegistered>>({});
  const menuRef = useRef<HTMLUListElement>(null);

  const [registryVersion, bumpRegistry] = useReducer((v: number) => v + 1, 0);

  const isMenuPopup =
    mode === 'horizontal' || (mode === 'vertical' && collapse);

  useEffect(() => {
    if (collapse) setOpenedMenus([]);
  }, [collapse]);

  useEffect(() => {
    if (defaultActive === activePath) return;
    let current = activePath;
    if (!itemsRef.current[defaultActive]) current = '';
    const itemsInData = itemsRef.current;
    const item =
      itemsInData[defaultActive] ||
      (current && itemsInData[current]) ||
      itemsInData[defaultActive || ''];
    setActivePath(item ? item.path : defaultActive);
  }, [defaultActive]);

  const enableScroll = scrollToActive && mode === 'vertical' && !collapse;
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!enableScroll) return;

    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      const el = document.querySelector('aside a[role=menuitem].is-active');
      el?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    }, 320);
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [activePath, enableScroll]);

  const addMenuItem = useCallback(
    (item: MenuItemRegistered) => {
      itemsRef.current[item.path] = item;
      bumpRegistry();
    },
    [bumpRegistry],
  );

  const removeMenuItem = useCallback(
    (item: MenuItemRegistered) => {
      delete itemsRef.current[item.path];
      bumpRegistry();
    },
    [bumpRegistry],
  );

  const addSubMenu = useCallback(
    (item: MenuItemRegistered) => {
      subMenusRef.current[item.path] = item;
      bumpRegistry();
    },
    [bumpRegistry],
  );

  const removeSubMenu = useCallback(
    (item: MenuItemRegistered) => {
      delete subMenusRef.current[item.path];
      bumpRegistry();
    },
    [bumpRegistry],
  );

  function getActivePaths(): string[] {
    const activeItem = activePath && itemsRef.current[activePath];
    if (!activeItem || mode === 'horizontal' || collapse) return [];
    return activeItem.parentPaths;
  }

  const openMenu = useCallback(
    (path: string, parentPaths: string[]) => {
      setOpenedMenus((prev) => {
        if (prev.includes(path)) return prev;
        if (accordion) {
          const activeParentPaths = getActivePaths();
          const effectivePaths = activeParentPaths.includes(path)
            ? activeParentPaths
            : parentPaths;
          return [...prev.filter((p) => effectivePaths.includes(p)), path];
        }
        return [...prev, path];
      });
      onOpen?.(path, parentPaths);
    },

    [accordion, onOpen, activePath, mode, collapse],
  );

  const closeMenu = useCallback(
    (path: string, parentPaths: string[]) => {
      setOpenedMenus((prev) => {
        if (accordion) {
          const subMenu = subMenusRef.current[path];
          return (subMenu?.parentPaths ?? []).filter((p) => p !== path);
        }
        return prev.filter((p) => p !== path);
      });
      onClose?.(path, parentPaths);
    },
    [accordion, onClose],
  );

  const handleMenuItemClick = useCallback(
    (data: MenuItemClicked) => {
      if (mode === 'horizontal' || collapse) {
        setOpenedMenus([]);
      }
      const { parentPaths, path } = data;
      if (!path || !parentPaths) return;
      setActivePath(path);
      onSelect?.(path, parentPaths);
    },
    [mode, collapse, onSelect],
  );

  const handleSubMenuClick = useCallback(
    (data: MenuItemRegistered) => {
      if (openedMenus.includes(data.path)) {
        closeMenu(data.path, data.parentPaths);
      } else {
        openMenu(data.path, data.parentPaths);
      }
    },
    [openedMenus, closeMenu, openMenu],
  );

  useEffect(() => {
    const activeItem = activePath && itemsRef.current[activePath];
    if (!activeItem || mode === 'horizontal' || collapse) return;
    activeItem.parentPaths.forEach((p) => {
      const sub = subMenusRef.current[p];
      if (sub) openMenu(p, sub.parentPaths);
    });
  }, [activePath, registryVersion]);

  const contextValue = useMemo(
    () => ({
      activePath,
      openedMenus,
      isMenuPopup,
      theme,
      mode,
      collapse,
      collapseShowTitle,
      rounded,
      items: itemsRef.current,
      subMenus: subMenusRef.current,
      handleMenuItemClick,
      handleSubMenuClick,
      openMenu,
      closeMenu,
      addMenuItem,
      removeMenuItem,
      addSubMenu,
      removeSubMenu,
    }),
    [
      activePath,
      openedMenus,
      isMenuPopup,
      theme,
      mode,
      collapse,
      collapseShowTitle,
      rounded,
      handleMenuItemClick,
      handleSubMenuClick,
      openMenu,
      closeMenu,
      addMenuItem,
      removeMenuItem,
      addSubMenu,
      removeSubMenu,
    ],
  );

  const classes = useMemo(() => {
    const base = ['admin-menu'];
    base.push(`admin-menu--${mode}`);
    base.push(`admin-menu--${theme}`);
    if (rounded) base.push('admin-menu--rounded');
    if (collapse) base.push('admin-menu--collapse');
    if (className) base.push(className);
    return base.join(' ');
  }, [mode, theme, rounded, collapse, className]);

  function renderMenuItems(items: MenuRecordRaw[]): React.ReactNode {
    const pathCounts = new Map<string, number>();
    for (const item of items) {
      pathCounts.set(item.path, (pathCounts.get(item.path) ?? 0) + 1);
    }
    return items.map((item, index) => {
      const hasChildren = item.children && item.children.length > 0;
      const duplicated = (pathCounts.get(item.path) ?? 0) > 1;
      const key = duplicated ? `${item.path}::${index}` : item.path;
      if (hasChildren) {
        return (
          <SubMenu
            key={key}
            path={item.path}
            icon={item.icon}
            activeIcon={item.activeIcon}
            badge={item.badge}
            badgeType={item.badgeType}
            badgeVariants={item.badgeVariants}
            title={item.name}
          >
            {renderMenuItems(item.children!)}
          </SubMenu>
        );
      }
      return (
        <MenuItem
          key={key}
          path={item.path}
          icon={item.icon}
          activeIcon={item.activeIcon}
          badge={item.badge}
          badgeType={item.badgeType}
          badgeVariants={item.badgeVariants}
          query={item.query}
          title={item.name}
        />
      );
    });
  }

  const renderedItems = useMemo(
    () => renderMenuItems(menus),
    [menus, mode, theme, collapse, collapseShowTitle, rounded],
  );
  const itemNodes = useMemo(() => {
    const arr: React.ReactNode[] = [];
    React.Children.forEach(renderedItems, (c) => arr.push(c));
    return arr;
  }, [renderedItems]);

  const [sliceIndex, setSliceIndex] = useState(-1);

  const sliceIndexRef = useRef(-1);
  const applySliceIndex = useCallback((v: number) => {
    sliceIndexRef.current = v;
    setSliceIndex(v);
  }, []);
  const isFirstTimeRenderRef = useRef(true);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const rafRef = useRef(0);

  const calcSliceIndex = useCallback(() => {
    const el = menuRef.current;
    if (!el) return -1;
    const nodes = [...(el.childNodes ?? [])].filter(
      (item) =>
        item.nodeName !== '#comment' &&
        (item.nodeName !== '#text' || (item.nodeValue ?? '').trim()),
    ) as HTMLElement[];

    const moreItemWidth = 46;
    const computedMenuStyle = getComputedStyle(el);
    const paddingLeft = Number.parseInt(computedMenuStyle.paddingLeft, 10);
    const paddingRight = Number.parseInt(computedMenuStyle.paddingRight, 10);
    const menuWidth = el.clientWidth - paddingLeft - paddingRight;

    let calcWidth = 0;
    let slice = 0;
    nodes.forEach((item, index) => {
      calcWidth += calcMenuItemWidth(item);
      if (calcWidth <= menuWidth - moreItemWidth) {
        slice = index + 1;
      }
    });
    return slice === nodes.length ? -1 : slice;
  }, []);

  const handleResize = useCallback(() => {
    if (sliceIndexRef.current === calcSliceIndex()) {
      return;
    }
    const callback = () => {
      applySliceIndex(-1);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        applySliceIndex(calcSliceIndex());
      });
    };
    callback();
    if (isFirstTimeRenderRef.current) {
      callback();
      isFirstTimeRenderRef.current = false;
    } else {
      const t = setTimeout(callback, 33.34);
      timersRef.current.add(t);
    }
  }, [calcSliceIndex, applySliceIndex]);

  useEffect(() => {
    if (mode !== 'horizontal') {
      applySliceIndex(-1);
      return;
    }
    const observer = new ResizeObserver(() => {
      handleResize();
    });
    if (menuRef.current) observer.observe(menuRef.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafRef.current);
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, [mode, itemNodes.length, handleResize]);

  const showSlotMore = sliceIndex !== -1 && sliceIndex < itemNodes.length;

  const moreActive =
    showSlotMore &&
    menus.some(
      (m, i) =>
        i >= sliceIndex &&
        (activePath === m.path || activePath.startsWith(`${m.path}/`)),
    );

  const rootMouseInChild = useRef(false);
  const rootSubCtxValue = useMemo(
    () =>
      createSubMenuContext({
        level: 1,
        parentPaths: [],
        mouseInChild: rootMouseInChild,
        addSubMenu,
        removeSubMenu,
      }),
    [addSubMenu, removeSubMenu],
  );

  return (
    <MenuContext.Provider value={contextValue}>
      <SubMenuContext.Provider value={rootSubCtxValue}>
        <ul
          ref={menuRef}
          className={classes}
          role="menu"
          style={{ '--menu-level': 0 } as React.CSSProperties}
        >
          {mode === 'horizontal' && showSlotMore ? (
            <>
              {itemNodes.slice(0, sliceIndex)}
              <SubMenu
                isMenuMore
                path="sub-menu-more"
                activeOverride={moreActive}
                title={<EllipsisIcon />}
              >
                {itemNodes.slice(sliceIndex)}
              </SubMenu>
            </>
          ) : (
            itemNodes
          )}
        </ul>
      </SubMenuContext.Provider>
    </MenuContext.Provider>
  );
}

function calcMenuItemWidth(menuItem: HTMLElement) {
  const computedStyle = getComputedStyle(menuItem);
  const marginLeft = Number.parseInt(computedStyle.marginLeft, 10);
  const marginRight = Number.parseInt(computedStyle.marginRight, 10);
  return menuItem.offsetWidth + marginLeft + marginRight || 0;
}
