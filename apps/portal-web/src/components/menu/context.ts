import { createContext, useContext } from 'react';
import type { MenuContextValue, SubMenuContextValue } from './types';

export const MenuContext = createContext<MenuContextValue | null>(null);

export const SubMenuContext = createContext<SubMenuContextValue | null>(null);

export function useMenuContext(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('useMenuContext must be used within <Menu>');
  return ctx;
}

export function useSubMenuContext(): SubMenuContextValue | null {
  return useContext(SubMenuContext);
}

/**
 * Provide menu context — used by <Menu> to inject context
 */
export function createMenuContext(value: MenuContextValue) {
  return value;
}

/**
 * Provide sub-menu context — used by <SubMenu> to inject context
 */
export function createSubMenuContext(value: SubMenuContextValue) {
  return value;
}
