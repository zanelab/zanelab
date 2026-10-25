import { useMenuContext } from './context';
import { AppIcon, renderMenuIcon } from '../icons/app-icon';

interface SubMenuContentProps {
  icon?: string | React.ReactNode;
  isMenuMore?: boolean;
  isTopLevelMenuSubmenu: boolean;
  level?: number;
  opened?: boolean;
  path: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
  title?: React.ReactNode;
}

/** 子菜单展开指示：右向（弹层模式）/ 下向（其余） */
const ChevronRight = () => <AppIcon name="chevron-right" className="size-4" />;

const ChevronDown = () => <AppIcon name="chevron-down" className="size-4" />;

export function SubMenuContent({
  icon,
  isMenuMore = false,
  isTopLevelMenuSubmenu: _isTopLevelMenuSubmenu,
  level = 0,
  opened = false,
  path: _path,
  className = '',
  onClick,
  children,
  title,
}: SubMenuContentProps) {
  const rootMenu = useMenuContext();
  const collapse = rootMenu.collapse;
  const isFirstLevel = level === 1;
  const mode = rootMenu.mode;

  const getCollapseShowTitle =
    rootMenu.collapseShowTitle && isFirstLevel && collapse;
  const showArrowIcon = mode === 'horizontal' || !(isFirstLevel && collapse);
  const hiddenTitle =
    mode === 'vertical' && isFirstLevel && collapse && !getCollapseShowTitle;

  // Arrow direction: ChevronRight for popup-mode submenus, ChevronDown otherwise
  const useRightArrow =
    (mode === 'horizontal' && !isFirstLevel) ||
    (mode === 'vertical' && collapse);

  const classes = [
    'admin-sub-menu-content',
    getCollapseShowTitle ? 'is-collapse-show-title' : '',
    isMenuMore ? 'is-more' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} onClick={onClick}>
      {children}
      {!isMenuMore && icon && (
        <span className="admin-menu__icon">{renderMenuIcon(icon)}</span>
      )}
      {!hiddenTitle && (
        <div className="admin-sub-menu-content__title">{title}</div>
      )}
      {!isMenuMore && showArrowIcon && (
        <span
          className="admin-sub-menu-content__icon-arrow size-4"
          // iconArrowStyle：展开时 180° 旋转（reference sub-menu-content.vue:71-73）
          style={{ transform: opened ? 'rotate(180deg)' : undefined }}
        >
          {useRightArrow ? <ChevronRight /> : <ChevronDown />}
        </span>
      )}
    </div>
  );
}
