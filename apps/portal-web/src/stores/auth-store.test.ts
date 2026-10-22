import { beforeEach, describe, expect, it } from 'vitest';
import { initialAuthState, useAuthStore } from './auth-store';
import type { Session, User } from '../lib/supabase';

function mockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'admin@example.com',
    user_metadata: { nickname: '管理员' },
    ...overrides,
  } as unknown as User;
}

function mockSession(overrides: Partial<Session> = {}): Session {
  const user = mockUser();
  return {
    access_token: 'abc',
    refresh_token: 'r1',
    user,
    ...overrides,
  } as unknown as Session;
}

beforeEach(() => {
  useAuthStore.setState(initialAuthState);
});

describe('useAuthStore', () => {
  it('初始未登录', () => {
    expect(useAuthStore.getState()).toMatchObject({
      token: '',
      refreshToken: undefined,
      user: null,
      session: null,
      isInitialized: false,
    });
  });

  it('setToken 仅更新 token', () => {
    useAuthStore.getState().setToken('abc');
    expect(useAuthStore.getState().token).toBe('abc');
    expect(useAuthStore.getState().user).toBeNull();

    useAuthStore.getState().setToken('def');
    expect(useAuthStore.getState().token).toBe('def');
  });

  it('setSession 设置完整登录态（含 user）', () => {
    const session = mockSession();
    useAuthStore.getState().setSession(session);
    expect(useAuthStore.getState()).toMatchObject({
      token: 'abc',
      refreshToken: 'r1',
      user: session.user,
      session,
    });
  });

  it('setSession(null) 清空 user', () => {
    const session = mockSession();
    useAuthStore.getState().setSession(session);
    expect(useAuthStore.getState().user).not.toBeNull();
    useAuthStore.getState().setSession(null);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBe('');
  });

  it('logout 清空 session/token/user', () => {
    const session = mockSession();
    useAuthStore.getState().setSession(session);
    useAuthStore.getState().logout();
    expect(useAuthStore.getState()).toMatchObject({
      session: null,
      token: '',
      refreshToken: undefined,
      user: null,
    });
  });
});
