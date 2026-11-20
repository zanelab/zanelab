import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bindHostPermissions,
  getPermissionsSnapshot,
  hasPermission,
  setPermissions,
  subscribe,
  type PermissionSnapshot,
} from './permission';

// 模块级存储：每个用例后回到「无宿主」，避免用例间互相污染
afterEach(() => setPermissions(undefined));

describe('hasPermission', () => {
  it('无宿主（undefined）→ 一律放行（独立态，写操作靠后端 403 兜底）', () => {
    setPermissions(undefined);
    expect(hasPermission('skills:skill:create')).toBe(true);
  });

  it('传入非数组（老宿主 / 异常值）→ 记作无宿主 → 放行', () => {
    setPermissions('skills:skill:create');
    expect(getPermissionsSnapshot()).toBeUndefined();
    expect(hasPermission('skills:skill:create')).toBe(true);
  });

  it('空数组**不是**「无宿主」：有宿主但无权限 → 不放行', () => {
    setPermissions([]);
    expect(getPermissionsSnapshot()).toEqual([]);
    expect(hasPermission('skills:skill:create')).toBe(false);
  });

  it('命中权限码 → 放行', () => {
    setPermissions(['skills:skill:list', 'skills:skill:create']);
    expect(hasPermission('skills:skill:create')).toBe(true);
    expect(hasPermission('skills:skill:delete')).toBe(false);
  });

  it('含通配 * → 放行', () => {
    setPermissions(['*']);
    expect(hasPermission('skills:skill:create')).toBe(true);
  });
});

describe('subscribe / setPermissions', () => {
  it('写入变化通知订阅者；同一引用重复写入不通知', () => {
    const listener = vi.fn();
    const off = subscribe(listener);
    const perms = ['skills:skill:create'];
    setPermissions(perms);
    setPermissions(perms);
    expect(listener).toHaveBeenCalledTimes(1);
    setPermissions(undefined);
    expect(listener).toHaveBeenCalledTimes(2);
    off();
    setPermissions(['other']);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('bindHostPermissions', () => {
  it('独立态（无 onHostStateChange）→ 不订阅、不崩溃，按快照判定', () => {
    const off = bindHostPermissions({});
    expect(typeof off).toBe('function');
    expect(hasPermission('skills:skill:create')).toBe(true);
    expect(getPermissionsSnapshot()).toBeUndefined();
    off();
  });

  it('old host：onHostStateChange 不是函数 → 不订阅也不崩', () => {
    const off = bindHostPermissions({
      permissions: ['skills:skill:list'],
      onHostStateChange: 'not-a-function',
    });
    expect(hasPermission('skills:skill:create')).toBe(false);
    off();
  });

  it('宿主注入 + 推送：快照判定 → 推送后重算 → 退订转发给宿主', () => {
    const host: { push?: (snapshot: PermissionSnapshot) => void } = {};
    const hostUnsubscribe = vi.fn();
    const off = bindHostPermissions({
      permissions: ['skills:skill:create'],
      onHostStateChange: (listener: (snapshot: PermissionSnapshot) => void) => {
        host.push = listener;
        return hostUnsubscribe;
      },
    });
    expect(host.push).toBeDefined();
    expect(hasPermission('skills:skill:create')).toBe(true);

    // 菜单重算：权限变化后推送（消除「挂载早于菜单加载 → 权限为空」的竞态）
    host.push?.({ permissions: [] });
    expect(hasPermission('skills:skill:create')).toBe(false);

    // 推送的快照不带 permissions 时不改写：不能把「有宿主」误降级成独立态放行
    host.push?.({});
    expect(hasPermission('skills:skill:create')).toBe(false);

    host.push?.({ permissions: ['*'] });
    expect(hasPermission('skills:skill:create')).toBe(true);

    off();
    expect(hostUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('重复挂载不堆积：重入前退订上一次（退订由 main.tsx 的 unmount/render 负责）', () => {
    const hostUnsubscribe = vi.fn();
    const off = bindHostPermissions({
      permissions: [],
      onHostStateChange: () => hostUnsubscribe,
    });
    off();
    expect(hostUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
