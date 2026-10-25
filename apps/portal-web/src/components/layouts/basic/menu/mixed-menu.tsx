import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { MenuRecordRaw } from '@zanelab/types';
import type { NormalMenuProps } from '../../../menu';
import { NormalMenu } from '../../../menu';
import { findMenuByPath } from '@zanelab/utils';

interface LayoutMixedMenuProps extends NormalMenuProps {
  onDefaultSelect?: (menu: MenuRecordRaw, rootMenu?: MenuRecordRaw) => void;
  onEnter?: (menu: MenuRecordRaw) => void;
  onSelect?: (menu: MenuRecordRaw) => void;
}

/**
 * LayoutMixedMenu — 1:1 port of basic/menu/mixed-menu.vue.
 * 挂载时按当前路由触发 defaultSelect（onBeforeMount 等价）。
 */
export function LayoutMixedMenu({
  menus,
  onDefaultSelect,
  onEnter,
  onSelect,
  ...rest
}: LayoutMixedMenuProps) {
  const location = useLocation();

  // onBeforeMount：按当前路由发出默认选中菜单
  useEffect(() => {
    const menu = findMenuByPath(menus || [], location.pathname);
    if (menu) {
      const rootMenu = (menus || []).find(
        (item) => item.path === menu.parents?.[0],
      );
      onDefaultSelect?.(menu, rootMenu);
    }
  }, []);

  return (
    <NormalMenu {...rest} menus={menus} onEnter={onEnter} onSelect={onSelect} />
  );
}
