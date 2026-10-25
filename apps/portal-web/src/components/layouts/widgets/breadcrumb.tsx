import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { getMatchedRouteMetas } from '../../../router/route-meta';
import { menuTitle } from '../../../locales/i18n';
import { AppIcon, renderMenuIcon } from '../../icons/app-icon';

type BreadcrumbStyleType = 'background' | 'normal';

interface IBreadcrumb {
  icon?: ReactNode;
  isHome?: boolean;
  items?: IBreadcrumb[];
  path?: string;
  title?: string;
}

interface BreadcrumbProps {
  /** 覆盖内部派生的面包屑数据（默认从 route-meta 匹配链派生，等价于 route.matched） */
  items?: IBreadcrumb[];

  /** 仅一条时隐藏（等价于 hideWhenOnlyOne） */
  hideWhenOnlyOne?: boolean;
  showHome?: boolean;
  showIcon?: boolean;

  /** 面包屑样式 */
  type?: BreadcrumbStyleType;
  onSelect?: (path: string) => void;
}

/** mdi home-outline（reference 首页图标；与 builtin home 不同字形） */
const HomeIcon = () => <AppIcon name="home-outline" className="size-5" />;

/** chevron right（BreadcrumbSeparator） */
const ChevronRight = () => <AppIcon name="chevron-right" className="size-3" />;

/** chevron down（DropdownMenuTrigger 的展开指示） */
const ChevronDown = () => <AppIcon name="chevron-down" className="size-4" />;

/**
 * Breadcrumb — 1:1 port of widgets/breadcrumb.vue + BreadcrumbView.
 * 面包屑数据从 route-meta 匹配链内部派生（等价于 reference 的 route.matched 计算，
 * 过滤 hideInBreadcrumb / hideChildrenInMenu）；showHome 时插入 icon-only 首页项。
 * normal / background 两种样式；background 为箭头形分段（breadcrumb-background.vue）。
 * 有意省略：reference 的 breadcrumb-transition TransitionGroup（breadcrumb.vue:44/96，
 * 纯装饰性的 item-enter 进场动画）—— React 等价规则下不移植，以静态渲染替代。
 */
export function Breadcrumb({
  items,
  hideWhenOnlyOne,
  showHome = false,
  showIcon = false,
  type = 'normal',
  onSelect,
}: BreadcrumbProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // 订阅语言变化（09-09-i18n）：changeLanguage 后匹配链标题经 menuTitle 重算
  useTranslation();

  // breadcrumbs computed（breadcrumb.vue:32-66）—— route.matched 等价
  const breadcrumbs: IBreadcrumb[] =
    items ??
    (() => {
      const result: IBreadcrumb[] = [];
      for (const meta of getMatchedRouteMetas(location.pathname)) {
        if (meta.hideInBreadcrumb || meta.hideChildrenInMenu || !meta.path) {
          continue;
        }
        result.push({
          // route-meta 的 icon 为后端标识符字符串 → AppIcon 解析（09-08-icon-registry）
          icon: renderMenuIcon(meta.icon as ReactNode, 'size-4'),
          path: meta.path,

          // 渲染期经 menuTitle 解析（09-09-i18n）：i18nKey 命中取翻译，否则回退 title
          title: menuTitle({ name: meta.title ?? '', i18nKey: meta.i18nKey }),
        });
      }
      if (showHome) {
        // reference: { icon: 'mdi:home-outline', isHome: true, path: '/' } —— 无 title
        result.unshift({ icon: <HomeIcon />, isHome: true, path: '/' });
      }
      if (hideWhenOnlyOne && result.length === 1) {
        return [];
      }
      return result;
    })();

  function handleClick(path?: string) {
    if (!path) return;
    if (onSelect) {
      onSelect(path);
    } else {
      navigate(path);
    }
  }

  if (breadcrumbs.length <= 0) {
    return null;
  }

  if (type === 'background') {
    // background 样式：箭头形分段（breadcrumb-background.vue scoped style 1:1 移植）
    return (
      <nav className="breadcrumb-bg ml-2 flex">
        <style>{`
          .breadcrumb-bg li {
            height: 1.75rem;
          }
          .breadcrumb-bg li a {
            position: relative;
            margin-right: 2.25rem;
            display: flex;
            height: 1.75rem;
            align-items: center;
            padding: 0 0.5rem 0 0.3125rem;
            background: hsl(var(--accent));
            color: hsl(var(--muted-foreground));
            font-size: 13px;
          }
          .breadcrumb-bg li a > span {
            margin-left: -0.75rem;
          }
          .breadcrumb-bg li:first-child a > span {
            margin-left: -0.25rem;
          }
          .breadcrumb-bg li:first-child a {
            border-top-left-radius: calc(var(--radius) - 2px);
            border-bottom-left-radius: calc(var(--radius) - 2px);
            padding-left: 0.9375rem;
          }
          .breadcrumb-bg li:first-child a::before {
            border: none;
          }
          .breadcrumb-bg li:last-child a {
            border-top-right-radius: calc(var(--radius) - 2px);
            border-bottom-right-radius: calc(var(--radius) - 2px);
            padding-right: 0.9375rem;
          }
          .breadcrumb-bg li:last-child a::after {
            border: none;
          }
          .breadcrumb-bg li a::before,
          .breadcrumb-bg li a::after {
            position: absolute;
            top: 0;
            height: 0;
            width: 0;
            border: 0.875rem solid;
            border-color: hsl(var(--accent));
            content: "";
          }
          .breadcrumb-bg li a::before {
            left: -1.75rem;
            z-index: 10;
            border-left-color: transparent;
          }
          .breadcrumb-bg li a::after {
            left: 100%;
            border-left-color: hsl(var(--accent));
            border-top-color: transparent;
            border-right-color: transparent;
            border-bottom-color: transparent;
          }
          .breadcrumb-bg li:not(:last-child) a:hover {
            background: hsl(var(--accent-hover));
          }
          .breadcrumb-bg li:not(:last-child) a:hover::before {
            border-color: hsl(var(--accent-hover));
            border-left-color: transparent;
          }
          .breadcrumb-bg li:not(:last-child) a:hover::after {
            border-left-color: hsl(var(--accent-hover));
          }
        `}</style>
        <ul className="flex">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <li key={`${item.path}-${item.title}-${index}`}>
                <a
                  href="javascript:void 0"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isLast) handleClick(item.path);
                  }}
                >
                  <span className="flex-center z-10 h-full">
                    {showIcon && item.icon ? (
                      <span
                        className={`mr-1 shrink-0 ${item.isHome ? 'size-5' : 'size-4'}`}
                      >
                        {item.icon}
                      </span>
                    ) : null}
                    <span
                      className={
                        isLast ? 'text-foreground font-normal' : undefined
                      }
                    >
                      {item.title}
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  // normal 样式：shadcn Breadcrumb（breadcrumb.vue）
  return (
    <nav className="text-muted-foreground ml-2 flex items-center gap-1 text-sm">
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <span
            key={`${item.path}-${item.title}-${index}`}
            className="flex items-center gap-1"
          >
            {item.items && item.items.length > 0 ? (
              <BreadcrumbDropdown
                item={item}
                showIcon={showIcon}
                onSelect={handleClick}
              />
            ) : isLast ? (
              <span className="flex-center text-foreground font-normal">
                {showIcon && item.icon ? (
                  <span className={`mr-1 ${item.isHome ? 'size-5' : 'size-4'}`}>
                    {item.icon}
                  </span>
                ) : null}
                {item.title}
              </span>
            ) : (
              <button
                type="button"
                className="flex-center hover:text-foreground transition-colors"
                onClick={() => handleClick(item.path)}
              >
                {showIcon && item.icon ? (
                  <span className={`mr-1 ${item.isHome ? 'size-5' : 'size-4'}`}>
                    {item.icon}
                  </span>
                ) : null}
                {item.title}
              </button>
            )}
            {index < breadcrumbs.length - 1 && !item.isHome ? (
              <ChevronRight />
            ) : null}
          </span>
        );
      })}
    </nav>
  );
}

/**
 * 面包屑下拉子菜单 —— DropdownMenu + ChevronDown 触发器
 * （reference breadcrumb.vue:45-63 的 React 等价，daisyUI dropdown 实现）
 */
function BreadcrumbDropdown({
  item,
  showIcon,
  onSelect,
}: {
  item: IBreadcrumb;
  showIcon: boolean;
  onSelect: (path?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="dropdown"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="dropdown-toggle hover:text-foreground flex items-center gap-1 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {/* reference breadcrumb.vue:48 —— DropdownMenuTrigger 内 上游图标组件 为 size-5 */}
        {showIcon && item.icon ? (
          <span className="mr-1 size-5">{item.icon}</span>
        ) : null}
        {item.title}
        <ChevronDown />
      </button>
      {open ? (
        <ul
          tabIndex={0}
          className="dropdown-content menu border-base-300 bg-popover text-popover-foreground z-9999 mt-1 min-w-32 rounded-md border p-1 shadow-md"
        >
          {item.items!.map((menuItem) => (
            <li key={`sub-${menuItem.path}`}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(menuItem.path);
                }}
              >
                {menuItem.title}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
