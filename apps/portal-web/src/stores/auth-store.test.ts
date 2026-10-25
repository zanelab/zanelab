import { beforeEach, describe, expect, it } from 'vitest';
import { initialAuthState, useAuthStore } from './auth-store';
import type { UserInfo } from '../types';

const user: UserInfo = { id: 1, username: 'admin', nickname: '管理员' };

beforeEach(() => {
  useAuthStore.setState(initialAuthState);
});

describe('useAuthStore', () => {
  it('初始未登录', () => {
    expect(useAuthStore.getState()).toMatchObject({
      token: '',
      refreshToken: undefined,
      user: null,
    });
  });

  it('setToken 仅更新 token', () => {
    useAuthStore.getState().setToken('abc');
    expect(useAuthStore.getState().token).toBe('abc');
    expect(useAuthStore.getState().user).toBeNull();

    useAuthStore.getState().setToken('def');
    expect(useAuthStore.getState().token).toBe('def');
  });

  it('setAuth 设置完整登录态（含 user）', () => {
    useAuthStore.getState().setAuth({ token: 'abc', refreshToken: 'r1', user });
    expect(useAuthStore.getState()).toMatchObject({
      token: 'abc',
      refreshToken: 'r1',
      user,
    });
  });

  it('setAuth 未带 user 时 user 置 null', () => {
    useAuthStore.getState().setAuth({ token: 'abc' });
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('setUser 更新当前用户', () => {
    useAuthStore.getState().setAuth({ token: 'abc', user });
    useAuthStore.getState().setUser({ ...user, nickname: '超管' });
    expect(useAuthStore.getState().user?.nickname).toBe('超管');
  });

  it('logout 清空 token/refreshToken/user', () => {
    useAuthStore.getState().setAuth({ token: 'abc', refreshToken: 'r1', user });
    useAuthStore.getState().logout();
    expect(useAuthStore.getState()).toMatchObject({
      token: '',
      refreshToken: undefined,
      user: null,
    });
  });
});
