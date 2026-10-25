import { create } from 'zustand';
import type { HeaderMode, LayoutMode } from '@zanelab/types';

/**
 * 本 store 是 React port 自建的会话级布局状态。单一事实来源约定：
 * - 布局偏好（sidebar/header/mode 等持久化配置）归 preferences-store；
 * - 本 store 仅承载运行时派生态 —— 当前仅 isDark/setIsDark 被消费
 *   （ThemeProvider + 主题相关组件）。其余字段为保留的过渡面，调用方
 *   应一律读写 preferences-store，勿以本 store 为准（其 toggleSidebar
 *   语义与 preferences-store 的 sidebar.hidden 切换不同，勿混用）。
 */
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

  /**
   * 锁屏密码（等价 reference accessStore.lockScreenPassword —— 由
   * LockScreenModal 提交写入，/lock 页解锁时校验；会话级运行时状态）
   */
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
