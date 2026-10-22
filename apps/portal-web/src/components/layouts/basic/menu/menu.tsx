import type { MenuRecordRaw } from '@zanelab/types';
import type { MenuProps } from '../../../menu';
import { Menu } from '../../../menu';

interface LayoutMenuProps extends MenuProps {
  menus: MenuRecordRaw[];
  defaultActive?: string;
  onSelect?: (path: string, mode?: MenuProps['mode']) => void;
  onOpen?: (path: string, parentPaths: string[]) => void;
  className?: string;
}

export function LayoutMenu({
  accordion = true,
  className,
  collapse,
  collapseShowTitle,
  defaultActive,
  menus = [],
  mode,
  rounded,
  theme,
  onSelect,
  onOpen,
}: LayoutMenuProps) {
  function handleMenuSelect(key: string) {
    onSelect?.(key, mode);
  }

  function handleMenuOpen(key: string, parentPaths: string[]) {
    onOpen?.(key, parentPaths);
  }

  return (
    <Menu
      accordion={accordion}
      className={className}
      collapse={collapse}
      collapseShowTitle={collapseShowTitle}
      defaultActive={defaultActive}
      mode={mode}
      rounded={rounded}
      scrollToActive
      theme={theme}
      menus={menus}
      onSelect={handleMenuSelect}
      onOpen={handleMenuOpen}
    />
  );
}
