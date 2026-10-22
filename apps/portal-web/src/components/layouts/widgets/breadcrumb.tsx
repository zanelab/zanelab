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
  items?: IBreadcrumb[];

  hideWhenOnlyOne?: boolean;
  showHome?: boolean;
  showIcon?: boolean;

  type?: BreadcrumbStyleType;
  onSelect?: (path: string) => void;
}

const HomeIcon = () => <AppIcon name="home-outline" className="size-5" />;

const ChevronRight = () => <AppIcon name="chevron-right" className="size-3" />;

const ChevronDown = () => <AppIcon name="chevron-down" className="size-4" />;

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

  useTranslation();

  const breadcrumbs: IBreadcrumb[] =
    items ??
    (() => {
      const result: IBreadcrumb[] = [];
      for (const meta of getMatchedRouteMetas(location.pathname)) {
        if (meta.hideInBreadcrumb || meta.hideChildrenInMenu || !meta.path) {
          continue;
        }
        result.push({
          icon: renderMenuIcon(meta.icon as ReactNode, 'size-4'),
          path: meta.path,

          title: menuTitle({ name: meta.title ?? '', i18nKey: meta.i18nKey }),
        });
      }
      if (showHome) {
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
