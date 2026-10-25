import { create } from 'zustand';
import type { UserInfo } from '../types';

export interface AuthState {
  token: string;
  refreshToken?: string;
  user: UserInfo | null;
}

/** 初始状态（未登录）；测试复位用（setState 部分合并，保留 action）。 */
export const initialAuthState: AuthState = {
  token: '',
  refreshToken: undefined,
  user: null,
};

interface AuthStore extends AuthState {
  setToken: (token: string) => void;
  setAuth: (payload: {
    token: string;
    refreshToken?: string;
    user?: UserInfo | null;
  }) => void;
  setUser: (user: UserInfo) => void;

  /** 登出：token/refreshToken/user 三字段全清（语义同旧 authSlice reducer）。 */
  logout: () => void;
}

/** 登录态（docs/技术方案.md §5.1/§5.3）：token 权威在 store，localStorage 仅持久化。 */
export const useAuthStore = create<AuthStore>()((set) => ({
  ...initialAuthState,

  setToken: (token) => set({ token }),

  setAuth: ({ token, refreshToken, user }) =>
    set({ token, refreshToken, user: user ?? null }),

  setUser: (user) => set({ user }),

  logout: () => set({ token: '', refreshToken: undefined, user: null }),
}));
