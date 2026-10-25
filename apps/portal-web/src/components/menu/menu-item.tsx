import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMenuContext, useSubMenuContext } from './context';
import { MenuBadge } from './menu-badge';
import { renderMenuIcon } from '../icons/app-icon';
import type { MenuItemProps, MenuItemRegistered } from './types';

/**
 * MenuItem — 1:1 port of menu-ui menu-item.vue.
 *
 * reference 以 router-link（custom）取 href：内链 → 路由 href，外链（自身
 * path 为 http(s) URL —— reference 的 parentPaths 链以自身 path 为末位）
 * → 原样 href；点击 prevent.stop 后仅派发 handleMenuItemClick —— 实际
 * 导航由外层（useNavigation / onSelect）承担，组件本身不直接 navigate
 * （等价参考实现 的职责边界）。
 *
 * DOM 结构：reference 的根元素即 <a>（router-link custom 无包装 li），
 * 是 ul 的直接子元素 —— menu.css 的 `> .admin-menu-item` 顶级缩进规则
 * 依赖此结构，不可加 li 包装。anchor 携带 rootMenu.theme 原始类
 * （dark/light，等价参考实现 的 :class="[rootMenu.theme, b(), ...]"）。
 *
 * 上游 Tooltip 组件（Radix portal，side right）→ createPortal(document.body) +
 * fixed 定位气泡：portal 是必须的 —— daisyUI 的 CSS tooltip（::before
 * 气泡，width:max-content）在触发器右侧参与布局，会把折叠态 59px 宽的
 * 滚动容器撑出横向滚动条（scrollWidth 99px）；portal 到 body 后脱离
 * 滚动容器，等价参考实现 上游 Tooltip 组件 的 portal 行为。气泡样式复刻
 * daisyUI tooltip（neutral 底、8px 偏移、垂直居中）。
 */
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

  // isTopLevelMenuItem（menu-item.vue:41-43）：parentMenu 组件是否为
  // Menu —— React 等价判定：所注入的上下文即根上下文（level === 1，
  // 由 Menu 提供；SubMenu 提供的上下文 level ≥ 2）
  const isTopLevel = !subMenuCtx || subMenuCtx.level === 1;

  // collapseShowTitle（reference menu-item.vue:43-48 —— collapseShowTitle
  // 偏好 && 顶级 && collapse，不含 mode 条件）
  const collapseShowTitle =
    menuCtx.collapseShowTitle && isTopLevel && menuCtx.collapse;

  // showTooltip（reference menu-item.vue:50-56 —— vertical 顶级 collapse 即
  // 显示 tooltip，与 collapseShowTitle 无关）。非 string title 时整体不渲染
  // 气泡（reference 以插槽内容渲染 tooltip，string-only 为已文档化差异）
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
    // deps 含 active：reference 的注册项为 reactive(computed(active))，
    // 注册表中的 active 标志随根 activePath 实时翻转
  }, [active]);

  // isHttp（reference menu-item.vue:37）：reference 的 parentPaths 链以
  // 自身 path 为末位（use-menu 的链路含本项），故判的是本项自身的 path
  const isHttp = isHttpUrl(path);

  // href：外链原样；内链 = 路径 + query（等价参考实现 router-link 的
  // to 拼接 qs.stringify(query)）
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

  // 上游 Tooltip 组件 side="right"（Radix portal）等价：hover 时以触发器
  // getBoundingClientRect 定位，fixed 挂载到 body；scroll（capture 捕获
  // 侧栏滚动）/resize 时同步坐标
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
        // 上游 Tooltip 组件 side="right" → portal 气泡（hover 显示）；
        // 进入该分支的 title 必为非空 string（见上方 showTooltip 守卫）
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
              // daisyUI tooltip-right 的气泡样式复刻（neutral 底 /
              // 8px 偏移 / 垂直居中），pointer-events:none 不拦截悬停链
              <div className="admin-menu-tooltip" style={tipCoords}>
                {title}
              </div>,
              document.body,
            )}
        </>
      ) : (
        // MenuBadge 在 __content 内部（reference menu-item.vue:126-135）
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

/** isHttpUrl（上游 shared 工具包 等价） */
function isHttpUrl(path: string): boolean {
  return /^https?:\/\//.test(path);
}

/** query 对象 → search 串（等价参考实现 的 qs.stringify） */
function toQueryString(query: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  }
  return params.toString();
}
