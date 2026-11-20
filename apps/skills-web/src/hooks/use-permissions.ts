import { useSyncExternalStore } from 'react';
import { getPermissionsSnapshot, subscribe } from '../utils/permission';

/**
 * 权限码订阅（React 绑定）：useSyncExternalStore 读模块级存储（React 19 内置，
 * 无新依赖）。两个快照函数同源——本应用只在浏览器渲染（jsdom / 独立 dev /
 * qiankun 都是客户端 createRoot），不需要区分服务端快照。
 * 放置依据 hook-guidelines.md「以 use 开头的自定义 Hook 放在 src/hooks/」。
 *
 * 订阅的意义：宿主权限可能**晚于挂载**到达（挂载早于菜单加载），此时需要重渲染
 * 才能从「独立态放行」切到真实判定——消费方只调 hasPermission，订阅由本 hook 承担。
 */
export function usePermissions(): string[] | undefined {
  return useSyncExternalStore(
    subscribe,
    getPermissionsSnapshot,
    getPermissionsSnapshot,
  );
}
