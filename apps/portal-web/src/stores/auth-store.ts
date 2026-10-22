import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session, User } from '../lib/supabase';

export interface AuthState {
  session: Session | null;
  user: User | null;
  token: string;
  refreshToken: string | undefined;
  isInitialized: boolean;
}

export const initialAuthState: AuthState = {
  session: null,
  user: null,
  token: '',
  refreshToken: undefined,
  isInitialized: false,
};

interface AuthStore extends AuthState {
  init: () => Promise<void>;
  setSession: (session: Session | null) => void;
  setToken: (token: string) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  ...initialAuthState,

  init: async () => {
    const {
      data: { subscription: _unused },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        token: session?.access_token ?? '',
        refreshToken: session?.refresh_token,
      });
    });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        set({
          session,
          user: session.user,
          token: session.access_token,
          refreshToken: session.refresh_token,
          isInitialized: true,
        });
      } else {
        set({ isInitialized: true });
      }
    } catch (err) {
      console.error('[auth-store] init failed:', err);
      set({ isInitialized: true });
    }
  },

  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      token: session?.access_token ?? '',
      refreshToken: session?.refresh_token,
    }),

  setToken: (token) => set({ token }),

  logout: async () => {
    await supabase.auth.signOut();
    set({
      session: null,
      user: null,
      token: '',
      refreshToken: undefined,
    });
  },
}));
