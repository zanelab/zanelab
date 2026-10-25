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
  // 注册表版本 —— 等价 watch(items, initMenu)（menu.vue:99 对 reactive
  // 注册表的 deep watch：注册/注销时重跑 initMenu）
  const [registryVersion, bumpRegistry] = useReducer((v: number) => v + 1, 0);

  const isMenuPopup =
    mode === 'horizontal' || (mode === 'vertical' && collapse);

  // Clear opened menus when collapsing
  useEffect(() => {
    if (collapse) setOpenedMenus([]);
  }, [collapse]);

  // watch(() => props.defaultActive)（menu.vue:101-109）：prop 变化时同步
  // activePath；未注册（非菜单项）时清空 —— 等价 updateActiveName 的回退链。
  // Vue 中 activePath.value = '' 是同步赋值，updateActiveName 随后读到 ''
  // 走不到回退；React 的 setState 异步，故以本地变量 current 承载清空语义
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

  // useMenuScroll：aside 作用域 + a[role=menuitem].is-active（React port 中
  // role 在 anchor 上，等价 reference use-menu-scroll.ts:28-30 的选择器）
  const enableScroll = scrollToActive && mode === 'vertical' && !collapse;
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!enableScroll) return;

    // useDebounceFn(scrollToActiveItem, 320) 等价
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
    // mode/collapse 必入 deps：getActivePaths 实时读取二者（reference 经
    // Vue 响应式 props 始终读实时值），运行时切换折叠后旧闭包会以展开态
    // 过滤 openedMenus
    [accordion, onOpen, activePath, mode, collapse],
  );

  const closeMenu = useCallback(
    (path: string, parentPaths: string[]) => {
      setOpenedMenus((prev) => {
        if (accordion) {
          // reference closeMenu（menu.vue:279-289）：openedMenus = 该子菜单的
          // parentPaths 后 close(path) 将自身移除 —— parentPaths 链含自身，
          // 需 filter 掉，否则点击已展开的子菜单永远关不上
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

  // initMenu（menu.vue:226-235 + watch(items, initMenu)）等价：activePath
  // 变化（reference 中 reactive 注册表的 active 标志翻转触发 deep watch）
  // 或注册表变化（registryVersion）时展开激活项的父级。deps 不含
  // collapse/mode —— reference 的 collapse watcher 只清空 openedMenus
  // （上方 effect），取消折叠后不重展开
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
    // 同层兄弟节点间 key 必须唯一。后端菜单树可能下发 path 重复的节点
    // （如 /npa-plt-system/admin/user 同时出现在多个分组），直接以 path 作
    // key 会触发 React "two children with the same key" 警告。这里预统计
    // 同层 path 出现次数：path 唯一时 key 仍取 path（保持 reconciliation
    // 稳定），重复时追加 index 兜底唯一。
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

  // 水平溢出 "更多"（menu.vue:148-199 sliceIndex + useResizeObserver 等价）
  const [sliceIndex, setSliceIndex] = useState(-1);

  // sliceIndex 的 ref 镜像：handleResize 需读取当前值做"值未变直接返回"
  // 判断（reference 读 sliceIndex.value），稳定化的 useCallback 会捕获过期
  // state，故同步镜像到 ref
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

  // handleResize（menu.vue:193-205 的 1:1 等价，含 reference 自身的
  // "直接执行一次 + 首帧再执行/否则 33.34ms 延迟" 结构；callback 内先置
  // -1（还原全部项）再于下一帧重算，使测量发生在完整菜单上）
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

  // "更多" 触发器的 active 聚合（reference sub-menu.vue:76-91 聚合注册到
  // 自身上下文的 items/subMenus 的 active 标志）：被切走的顶层项包含激活
  // 路径时，省略号触发器亮起
  const moreActive =
    showSlotMore &&
    menus.some(
      (m, i) =>
        i >= sliceIndex &&
        (activePath === m.path || activePath.startsWith(`${m.path}/`)),
    );

  // 根 SubMenuContext（menu.vue:141-146 的 createSubMenuContext 1:1）：
  // level 1 + 根 mouseInChild ref + 真实注册表回调，无 handleMouseleave
  // （deepDispatch 链在根自然终止）。其存在使顶级子菜单的
  // handleMouseleave 早退分支（!collapse && vertical && subMenu）命中 ——
  // reference 的垂直展开态子菜单从不因 mouseout 自动收起，只能点击收起
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
