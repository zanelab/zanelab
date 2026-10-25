import type { MenuRecordRaw } from '@zanelab/types';
import { renderMenuIcon } from '../icons/app-icon';

export interface NormalMenuProps {
  activePath?: string;
  collapse?: boolean;
  menus?: MenuRecordRaw[];
  rounded?: boolean;
  theme?: 'dark' | 'light';
  onSelect?: (menu: MenuRecordRaw) => void;
  onEnter?: (menu: MenuRecordRaw) => void;
}

export function NormalMenu({
  activePath = '',
  collapse = false,
  menus = [],
  rounded = false,
  theme = 'dark',
  onSelect,
  onEnter,
}: NormalMenuProps) {
  function menuIcon(menu: MenuRecordRaw) {
    return activePath === menu.path ? menu.activeIcon || menu.icon : menu.icon;
  }

  const classes = [
    'admin-normal-menu',
    theme === 'dark' ? 'is-dark' : '',
    collapse ? 'is-collapse' : '',
    rounded ? 'is-rounded' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <ul className={`${classes} relative`}>
      {menus.map((menu) => (
        <li
          key={menu.path}
          className={`admin-normal-menu__item ${activePath === menu.path ? 'is-active' : ''}`}
          onClick={() => onSelect?.(menu)}
          onMouseEnter={() => onEnter?.(menu)}
        >
          {menuIcon(menu) && (
            // size-[1em]：span 仅有 max-height 无宽度，svg 需显式尺寸
            //（1em 随 .admin-normal-menu__icon 的 font-size 1.25×base 缩放）
            <span className="admin-normal-menu__icon">
              {renderMenuIcon(menuIcon(menu), 'size-[1em]')}
            </span>
          )}
          <span className="admin-normal-menu__name truncate">{menu.name}</span>
        </li>
      ))}
    </ul>
  );
}
