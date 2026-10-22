import { create } from 'zustand';
import type { HeaderMode, LayoutMode } from '@zanelab/types';

interface LayoutState {
  mode: LayoutMode;

  sidebarCollapsed: boolean;
  sidebarExpandOnHover: boolean;
  sidebarExpandOnHovering: boolean;
  sidebarExtraVisible: boolean;
  sidebarExtraCollapse: boolean;
  sidebarWidth: number;
  sidebarDraggable: boolean;

  headerHidden: boolean;
  headerMode: HeaderMode;

  isMobile: boolean;
  isDark: boolean;

  lockScreenPassword: string;

  setMode: (mode: LayoutMode) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarExpandOnHover: (val: boolean) => void;
  setSidebarExpandOnHovering: (val: boolean) => void;
  setSidebarExtraVisible: (visible: boolean) => void;
  setSidebarExtraCollapse: (collapse: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setSidebarDraggable: (draggable: boolean) => void;
  setHeaderHidden: (hidden: boolean) => void;
  setHeaderMode: (mode: HeaderMode) => void;
  setIsMobile: (val: boolean) => void;
  setIsDark: (val: boolean) => void;
  setLockScreenPassword: (password: string) => void;
  toggleSidebar: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  mode: 'sidebar-nav',
  sidebarCollapsed: false,
  sidebarExpandOnHover: false,
  sidebarExpandOnHovering: false,
  sidebarExtraVisible: false,
  sidebarExtraCollapse: false,
  sidebarWidth: 180,
  sidebarDraggable: true,
  headerHidden: false,
  headerMode: 'fixed',
  isMobile: false,
  isDark: false,
  lockScreenPassword: '',

  setMode: (mode) => set({ mode }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setSidebarExpandOnHover: (val) => set({ sidebarExpandOnHover: val }),
  setSidebarExpandOnHovering: (val) => set({ sidebarExpandOnHovering: val }),
  setSidebarExtraVisible: (visible) => set({ sidebarExtraVisible: visible }),
  setSidebarExtraCollapse: (collapse) =>
    set({ sidebarExtraCollapse: collapse }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setSidebarDraggable: (draggable) => set({ sidebarDraggable: draggable }),
  setHeaderHidden: (hidden) => set({ headerHidden: hidden }),
  setHeaderMode: (mode) => set({ headerMode: mode }),
  setIsMobile: (val) => set({ isMobile: val }),
  setIsDark: (val) => set({ isDark: val }),
  setLockScreenPassword: (password) => set({ lockScreenPassword: password }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
