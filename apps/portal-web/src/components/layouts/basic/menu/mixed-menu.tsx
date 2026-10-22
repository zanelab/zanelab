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

export function LayoutMixedMenu({
  menus,
  onDefaultSelect,
  onEnter,
  onSelect,
  ...rest
}: LayoutMixedMenuProps) {
  const location = useLocation();

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
