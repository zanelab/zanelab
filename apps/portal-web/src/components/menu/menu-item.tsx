import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMenuContext, useSubMenuContext } from './context';
import { MenuBadge } from './menu-badge';
import { renderMenuIcon } from '../icons/app-icon';
import type { MenuItemProps, MenuItemRegistered } from './types';

export function MenuItem({
  path,
  icon,
  activeIcon,
  disabled = false,
  badge,
  badgeType,
  badgeVariants,
  query,
  children,
  title,
}: MenuItemProps) {
  const menuCtx = useMenuContext();
  const subMenuCtx = useSubMenuContext();

  const active = menuCtx.activePath === path;
  const displayIcon = active ? activeIcon || icon : icon;

  const isTopLevel = !subMenuCtx || subMenuCtx.level === 1;

  const collapseShowTitle =
    menuCtx.collapseShowTitle && isTopLevel && menuCtx.collapse;

  const showTooltip =
    menuCtx.mode === 'vertical' &&
    isTopLevel &&
    menuCtx.collapse &&
    typeof title === 'string' &&
    title.length > 0;

  const parentPaths = subMenuCtx?.parentPaths ?? [];
  const item: MenuItemRegistered = { active, parentPaths, path, query };

  useEffect(() => {
    menuCtx.addMenuItem(item);
    subMenuCtx?.addSubMenu(item);
    return () => {
      menuCtx.removeMenuItem(item);
      subMenuCtx?.removeSubMenu(item);
    };
  }, [active]);

  const isHttp = isHttpUrl(path);

  const href = isHttp ? path : path + (query ? `?${toQueryString(query)}` : '');

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      menuCtx.handleMenuItemClick({ parentPaths, path, query });
    },
    [disabled, menuCtx, parentPaths, path, query],
  );

  const triggerRef = useRef<HTMLDivElement>(null);
  const [tipCoords, setTipCoords] = useState<{
    left: number;
    top: number;
  } | null>(null);

  useEffect(() => {
    if (!tipCoords) return;
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setTipCoords((prev) =>
        prev &&
        prev.left === rect.right + 8 &&
        prev.top === rect.top + rect.height / 2
          ? prev
          : { left: rect.right + 8, top: rect.top + rect.height / 2 },
      );
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [tipCoords !== null]);

  const classes = useMemo(() => {
    const base = [menuCtx.theme, 'admin-menu-item'];
    if (active) base.push('is-active');
    if (disabled) base.push('is-disabled');
    if (collapseShowTitle) base.push('is-collapse-show-title');
    return base.join(' ');
  }, [menuCtx.theme, active, disabled, collapseShowTitle]);

  const badgeNode =
    menuCtx.mode !== 'horizontal' && (badge || badgeType) ? (
      <MenuBadge
        badge={badge}
        badgeType={badgeType}
        badgeVariants={badgeVariants}
        className="right-2"
      />
    ) : null;

  return (
    <a
      className={classes}
      href={href}
      role="menuitem"
      aria-disabled={disabled}
      onClick={handleClick}
    >
      {showTooltip ? (
        <>
          <div
            ref={triggerRef}
            className="admin-menu-tooltip__trigger"
            onMouseEnter={() => {
              const el = triggerRef.current;
              if (!el) return;
              const rect = el.getBoundingClientRect();
              setTipCoords({
                left: rect.right + 8,
                top: rect.top + rect.height / 2,
              });
            }}
            onMouseLeave={() => setTipCoords(null)}
          >
            {displayIcon && (
              <span className="admin-menu__icon">
                {renderMenuIcon(displayIcon)}
              </span>
            )}
            {children}
            {collapseShowTitle && title && (
              <span className="admin-menu__name">{title}</span>
            )}
          </div>
          {tipCoords &&
            createPortal(
              <div className="admin-menu-tooltip" style={tipCoords}>
                {title}
              </div>,
              document.body,
            )}
        </>
      ) : (
        <span className="admin-menu-item__content">
          {badgeNode}
          {displayIcon && (
            <span className="admin-menu__icon">
              {renderMenuIcon(displayIcon)}
            </span>
          )}
          {children}
          {title && <span className="admin-menu__name">{title}</span>}
        </span>
      )}
    </a>
  );
}

function isHttpUrl(path: string): boolean {
  return /^https?:\/\//.test(path);
}

function toQueryString(query: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  }
  return params.toString();
}
