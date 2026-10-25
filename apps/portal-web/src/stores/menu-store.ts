import { create } from 'zustand';
import type { MenuItem } from '../types';

export interface MenuState {
  menus: MenuItem[];
  permissions: string[]; // 由菜单递归提取的权限码 + 外部合并的权限码
}

/** 初始状态（空菜单）；测试复位用（setState 部分合并，保留 action）。 */
export const initialMenuState: MenuState = {
  menus: [],
  permissions: [],
};

/** 递归提取菜单树中的权限码（docs/技术方案.md §6.2）。 */
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

/**
 * 菜单与权限（docs/技术方案.md §6.2）：`menus` 永远存全量原始契约，
 * menuType 分流是视图关注点（spec state-management.md §菜单视图分流）；
 * 权限码单一来源是后端菜单，setMenus 内部递归派生 permissions。
 */
export const useMenuStore = create<MenuStore>()((set, get) => ({
  ...initialMenuState,

  setMenus: (menus) => set({ menus, permissions: flattenPermissions(menus) }),

  mergePermissions: (codes) => {
    // 语义同旧 reducer：无新码则不写 state（不触发订阅通知）
    const extra = codes.filter((p) => !get().permissions.includes(p));
    if (extra.length) {
      set({ permissions: [...get().permissions, ...extra] });
    }
  },

  clearMenus: () => set({ menus: [], permissions: [] }),
}));
