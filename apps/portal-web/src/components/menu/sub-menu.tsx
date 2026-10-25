import { useMemo, useRef, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  SubMenuContext,
  useMenuContext,
  useSubMenuContext,
  createSubMenuContext,
} from './context';
import { CollapseTransition } from './collapse-transition';
import { SubMenuContent } from './sub-menu-content';
import { MenuBadge } from './menu-badge';
import type { MenuItemRegistered, SubMenuProps } from './types';

/**
 * SubMenu — 1:1 port of menu-ui sub-menu.vue.
 *
 * 上游 HoverCard 组件（Radix portal + side/sideOffset/collisionPadding）→
 * createPortal(document.body) + fixed 定位浮层（.admin-menu__popup-container
 * 的 is-side-right / is-side-bottom，sideOffset 以 margin 呈现）：portal 是
 * 必须的 —— CSS 绝对定位会被祖先 overflow（侧栏 Scrollbar 的 overflow:auto、
 * header 的 overflow-hidden）裁剪。坐标取 trigger（li）的
 * getBoundingClientRect，scroll/resize 时重算；side-right 下溢视口时按实测
 * 高度上移（Radix avoidCollisions + collisionPadding {top:20} 的近似），
 * overflow-auto + max-height 近似 available-height。
 *
 * mouseleave 的 300ms 定时器经 mouseInChild ref 读取实时标志（等价
 * reference 的 ref 语义 —— Vue 模板中的 !mouseInChild.value 是定时器
 * 触发时的实时读取，而非闭包快照）；子级 enter/leave 写父级上下文的
 * mouseInChild，deepDispatch 向父级递归派发 leave。上下文 value 中的
 * handleMouseleave 经 handlersRef 转发到当次渲染的闭包 —— memo 化的
 * context value 若直接捕获 menuCtx，collapse/mode 运行时切换后读到过期值
 * （reference 经 Vue 响应式 props 始终读实时值）。
 *
 * handleMouseleave 的早退分支（!collapse && vertical && subMenu ——
 * sub-menu.vue:143-146）：根 Menu 提供 level:1 的 SubMenuContext
 * （等价 menu.vue:141-146），故该分支对**所有**垂直非折叠子菜单命中 ——
 * 展开态的子菜单不因 mouseout 自动收起，只能点击收起（reference 行为）。
 */
export function SubMenu({
  path,
  icon,
  activeIcon,
  disabled = false,
  isMenuMore = false,
  activeOverride,
  badge,
  badgeType,
  badgeVariants,
  children,
  title,
}: SubMenuProps) {
  const menuCtx = useMenuContext();
  const parentSubCtx = useSubMenuContext();
  // level（sub-menu.vue:47）：(subMenu?.level ?? 0) + 1 —— 根 Menu 提供
  // level:1 的上下文（menu.vue:141），故顶级为 2、逐级 +1，与 reference
  // 的数值链一致
  const level = (parentSubCtx?.level ?? 0) + 1;

  // mouseInChild —— 双用途：自身 popup 判活 + 由子级写入（经 subCtxValue）
  const mouseInChild = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const opened = menuCtx.openedMenus.includes(path);
  // isTopLevelMenuSubmenu（sub-menu.vue:56-58）：parentMenu 组件是否为
  // Menu —— React 等价判定：所注入的父上下文即根上下文（level === 1；
  // 只有 Menu 提供 level:1，SubMenu 自身提供的上下文 level ≥ 2）
  const isTopLevel = !parentSubCtx || parentSubCtx.level === 1;

  // Accumulate parent paths
  const parentPaths = useMemo(() => {
    const ancestors = parentSubCtx?.parentPaths ?? [];
    return [...ancestors, path];
  }, [parentSubCtx?.parentPaths, path]);

  // 嵌套 ul 的 --menu-level 与 SubMenuContent 的 level（use-menu.ts:39-45
  // useMenuStyle + sub-menu.vue:61 currentLevel）：均取**父**上下文的
  // level —— reference 的 `menu ? (menu?.level ?? 0 + 1) : 0` 因运算符
  // 优先级实际求值为 menu.level（?? 只在 null/undefined 时回退），1:1
  // 保留此语义。顶级：父为根上下文 level 1 → ul level 1 / content
  // isFirstLevel ✓；二级：父为顶级 ctx level 2 → ul level 2
  const parentLevel = parentSubCtx ? parentSubCtx.level : 0;

  // Track active state: any child item or sub-menu is active
  // （等价参考实现 的 registered items/subMenus active 聚合 —— 注册表
  // 中的 active 标志由根 activePath 派生，路径前缀为其等价实现；
  // "更多" 触发器由 Menu 以 activeOverride 传入聚合结果）
  const prefixActive = useMemo(() => {
    return (
      menuCtx.activePath === path || menuCtx.activePath.startsWith(path + '/')
    );
  }, [menuCtx.activePath, path]);
  const active = activeOverride ?? prefixActive;

  const displayIcon = active ? activeIcon || icon : icon;

  const item: MenuItemRegistered = { active, parentPaths, path };

  useEffect(() => {
    parentSubCtx?.addSubMenu(item);
    menuCtx.addSubMenu(item);
    return () => {
      parentSubCtx?.removeSubMenu(item);
      menuCtx.removeSubMenu(item);
    };
    // deps 含 active：reference 的注册项为 reactive(computed(active))，
    // 注册表中的 active 标志随根 activePath 实时翻转（deep watch 的触发源）
  }, [active]);

  // 经 ref 转发到当次渲染的闭包：memo 化的 context value 不捕获过期 menuCtx
  const handlersRef = useRef<{
    handleMouseleave: (deepDispatch?: boolean) => void;
  }>({ handleMouseleave: () => {} });
  handlersRef.current = {
    handleMouseleave: (deepDispatch = false) => handleMouseleave(deepDispatch),
  };

  const subCtxValue = useMemo(
    () =>
      createSubMenuContext({
        level,
        parentPaths,
        mouseInChild,
        handleMouseleave: (deepDispatch = false) =>
          handlersRef.current.handleMouseleave(deepDispatch),
        addSubMenu: () => {},
        removeSubMenu: () => {},
      }),
    [level, parentPaths],
  );

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (disabled) return;
    if (menuCtx.collapse && menuCtx.mode === 'vertical') return;
    if (menuCtx.mode === 'horizontal') return;
    menuCtx.handleSubMenuClick({ active, parentPaths, path });
  }

  function handleMouseEnter(showTimeout = 300) {
    // reference sub-menu.vue:126-140：(!collapse && vertical) || disabled
    // 分支先写父级 mouseInChild 再返回 —— disabled 子项也标记父级悬停，
    // 否则父级 300ms 定时器会在指针下关闭 popup
    if ((!menuCtx.collapse && menuCtx.mode === 'vertical') || disabled) {
      if (parentSubCtx) parentSubCtx.mouseInChild!.current = true;
      return;
    }
    if (parentSubCtx) parentSubCtx.mouseInChild!.current = true;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      menuCtx.openMenu(path, parentPaths);
    }, showTimeout);
  }

  function handleMouseLeave(_deepDispatch = false) {
    handleMouseleave(_deepDispatch);
  }

  function handleMouseleave(deepDispatch = false) {
    if (!menuCtx.collapse && menuCtx.mode === 'vertical' && parentSubCtx) {
      parentSubCtx.mouseInChild!.current = false;
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    if (parentSubCtx) parentSubCtx.mouseInChild!.current = false;
    timerRef.current = setTimeout(() => {
      // 实时读取 ref（等价 Vue 模板 !mouseInChild.value 的定时器触发求值）
      if (!mouseInChild.current) {
        menuCtx.closeMenu(path, parentPaths);
      }
    }, 300);

    if (deepDispatch) {
      parentSubCtx?.handleMouseleave?.(true);
    }
  }

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const classes = [
    'admin-sub-menu',
    opened ? 'is-opened' : '',
    active ? 'is-active' : '',
    disabled ? 'is-disabled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const badgeNode = badge && (
    <MenuBadge
      badge={badge}
      badgeType={badgeType}
      badgeVariants={badgeVariants}
      className="right-6"
    />
  );

  const isPopup = menuCtx.isMenuPopup;
  // side bottom：水平一级；side right：其余（contentProps 等价）。
  // isFirstLevel（sub-menu.vue:62）= currentLevel === 1，currentLevel 取
  // 父上下文 level（subMenu?.level ?? 0）—— 即此处的 parentLevel（顶级
  // 父为根上下文 level 1），而非自身 level（顶级为 2）
  const side =
    menuCtx.mode === 'horizontal' && parentLevel === 1 ? 'bottom' : 'right';

  const liRef = useRef<HTMLLIElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupCoords, setPopupCoords] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const popupRafRef = useRef(0);

  // portal 浮层坐标：trigger 的 getBoundingClientRect + fixed 定位，
  // scroll（capture 捕获嵌套滚动容器）/resize 时重算
  useLayoutEffect(() => {
    if (!isPopup || !opened) return;
    const update = () => {
      const el = liRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      let left: number;
      let top: number;
      if (side === 'bottom') {
        left = rect.left;
        top = rect.bottom;
      } else {
        left = rect.right;

        // 下溢视口时上移（avoidCollisions + collisionPadding {top:20} 近似）；
        // 首帧 popup 未渲染（高度 0）时先按 trigger 顶部对齐，rAF 后按
        // 实测高度再校正一次
        const height = popupRef.current?.offsetHeight ?? 0;
        top = height
          ? Math.max(20, Math.min(rect.top, window.innerHeight - 20 - height))
          : rect.top;
      }
      setPopupCoords((prev) =>
        prev && prev.left === left && prev.top === top ? prev : { left, top },
      );
    };
    update();
    popupRafRef.current = requestAnimationFrame(update);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(popupRafRef.current);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isPopup, opened, side]);

  if (isPopup) {
    return (
      <li
        ref={liRef}
        className={classes}
        onMouseEnter={() => handleMouseEnter()}
        onMouseLeave={() => handleMouseLeave()}
      >
        <SubMenuContent
          className={active ? 'is-active' : ''}
          icon={displayIcon}
          isMenuMore={isMenuMore}
          isTopLevelMenuSubmenu={isTopLevel}
          level={parentLevel}
          opened={opened}
          path={path}
          onClick={handleClick}
          title={title}
        >
          {/* popup 分支不渲染徽章（reference sub-menu.vue:219-233 的
              上游 HoverCard 组件 trigger 内无 #content 插槽） */}
        </SubMenuContent>
        {opened &&
          createPortal(
            <div
              ref={popupRef}
              className={`admin-menu__popup-container ${menuCtx.theme} ${menuCtx.theme === 'dark' ? 'admin-menu--dark' : 'admin-menu--light'} ${menuCtx.mode === 'horizontal' ? 'is-horizontal' : ''} is-side-${side}`}
              style={{
                left: popupCoords?.left,
                top: popupCoords?.top,
              }}
              onMouseEnter={() => handleMouseEnter(100)}
              onMouseLeave={() => handleMouseLeave(true)}
            >
              {/* 模式类（等价参考实现 sub-menu.vue:235 的 is(mode)）：无
                  .admin-menu 基类，menu.css 的模式选择器均已基类限定，
                  此类惰性 —— 与 reference 的 DOM/行为一致 */}
              <div className={`admin-menu__popup admin-menu--${menuCtx.mode}`}>
                <SubMenuContext.Provider value={subCtxValue}>
                  <ul
                    className={`admin-menu ${menuCtx.rounded ? 'admin-menu--rounded' : ''}`}
                    style={
                      { '--menu-level': parentLevel } as React.CSSProperties
                    }
                  >
                    {children}
                  </ul>
                </SubMenuContext.Provider>
              </div>
            </div>,
            document.body,
          )}
      </li>
    );
  }

  return (
    <li
      className={classes}
      onMouseEnter={() => handleMouseEnter()}
      onMouseLeave={() => handleMouseLeave()}
    >
      <SubMenuContent
        className={active ? 'is-active' : ''}
        icon={displayIcon}
        isMenuMore={isMenuMore}
        isTopLevelMenuSubmenu={isTopLevel}
        level={parentLevel}
        opened={opened}
        path={path}
        onClick={handleClick}
        title={title}
      >
        {badgeNode}
      </SubMenuContent>
      <CollapseTransition show={opened}>
        <ul
          className={`admin-menu admin-collapse-transition ${menuCtx.rounded ? 'admin-menu--rounded' : ''}`}
          role="menu"
          style={{ '--menu-level': parentLevel } as React.CSSProperties}
        >
          <SubMenuContext.Provider value={subCtxValue}>
            {children}
          </SubMenuContext.Provider>
        </ul>
      </CollapseTransition>
    </li>
  );
}
