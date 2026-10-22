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

  const level = (parentSubCtx?.level ?? 0) + 1;

  const mouseInChild = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const opened = menuCtx.openedMenus.includes(path);

  const isTopLevel = !parentSubCtx || parentSubCtx.level === 1;

  const parentPaths = useMemo(() => {
    const ancestors = parentSubCtx?.parentPaths ?? [];
    return [...ancestors, path];
  }, [parentSubCtx?.parentPaths, path]);

  const parentLevel = parentSubCtx ? parentSubCtx.level : 0;

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
  }, [active]);

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

  const side =
    menuCtx.mode === 'horizontal' && parentLevel === 1 ? 'bottom' : 'right';

  const liRef = useRef<HTMLLIElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupCoords, setPopupCoords] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const popupRafRef = useRef(0);

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
        ></SubMenuContent>
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
