import { create } from 'zustand';
import type { MenuItem } from '../types';

export interface MenuState {
  menus: MenuItem[];
  permissions: string[];
}

export const initialMenuState: MenuState = {
  menus: [],
  permissions: [],
};

export function flattenPermissions(items: MenuItem[]): string[] {
  const result: string[] = [];
  const walk = (list: MenuItem[]) => {
    for (const item of list) {
      if (item.permission) result.push(item.permission);
      if (item.children?.length) walk(item.children);
    }
  };
  walk(items);
  return result;
}

interface MenuStore extends MenuState {
  setMenus: (menus: MenuItem[]) => void;
  mergePermissions: (codes: string[]) => void;
  clearMenus: () => void;
}

export const useMenuStore = create<MenuStore>()((set, get) => ({
  ...initialMenuState,

  setMenus: (menus) => set({ menus, permissions: flattenPermissions(menus) }),

  mergePermissions: (codes) => {
    const extra = codes.filter((p) => !get().permissions.includes(p));
    if (extra.length) {
      set({ permissions: [...get().permissions, ...extra] });
    }
  },

  clearMenus: () => set({ menus: [], permissions: [] }),
}));
