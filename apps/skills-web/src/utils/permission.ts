/**
 * skills-web 权限内核（模块级存储，非 React）。置于 utils/（非 React 纯模块，
 * 见 hook-guidelines.md「纯逻辑（无 Hook 依赖）放 src/utils/，不要伪装成 Hook」）。
 *
 * 数据源：宿主（portal）经 props 注入的 `permissions` 权限码数组（register.ts 的
 * getter，每次 mount 取值 → 挂载时快照），以及 `onHostStateChange(snapshot)` 推送
 * 的后续变更（snapshot.permissions 在菜单重算时更新，宿主侧按引用比对推送）。
 *
 * 判定规则（component-guidelines.md:66-67）：
 * - **不是数组 = 无宿主（独立态）→ 一律放行**：独立运行是一等公民场景，写操作
 *   由后端 403 兜底，前端隐藏只是体验优化。
 * - 是数组 → 命中权限码或含通配 `*` 才放行。注意**空数组不是「无宿主」**：
 *   有宿主但无权限 → 不放行（按钮隐藏）。
 */

/** 宿主推送的状态快照：本应用只消费 permissions（与 register.ts 的 HostState 同构的窄类型） */
export interface PermissionSnapshot {
  permissions?: string[];
}

/**
 * 宿主 props 上本应用消费的最小字段（结构类型）。
 * 用 `unknown` 而非 `string[]`：独立态/老宿主不传或传非数组时也要能安全判定。
 */
export interface PermissionHostProps {
  permissions?: unknown;
  onHostStateChange?: unknown;
}

/** 当前权限码；undefined = 无宿主（独立态） */
let current: string[] | undefined = undefined;

const listeners = new Set<() => void>();

/** 订阅权限变更；返回退订函数（useSyncExternalStore 的 subscribe 契约） */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 当前快照。useSyncExternalStore 要求引用稳定：只有真变时才换引用 */
export function getPermissionsSnapshot(): string[] | undefined {
  return current;
}

/** 写入权限码；非数组一律记作 undefined（无宿主）。引用未变则不通知（避免无谓重渲染） */
export function setPermissions(permissions: unknown): void {
  const next = Array.isArray(permissions)
    ? (permissions as string[])
    : undefined;
  if (next === current) return;
  current = next;
  listeners.forEach((listener) => listener());
}

/** 单个权限码是否放行（唯一判定入口，可单测） */
export function hasPermission(code: string): boolean {
  const permissions = current;
  if (!Array.isArray(permissions)) return true;
  return permissions.includes(code) || permissions.includes('*');
}

/**
 * 挂载时接线宿主权限（快照 + 订阅），返回退订函数。
 *
 * - **先快照**：props.permissions 是 getter，single-spa 每次 mount 取值。
 * - **再订阅**：mount 可能早于菜单加载（首次访问未登录即注册 → permissions 为
 *   空数组），只读快照会让按钮永久隐藏到重挂载；宿主在 permissions 引用变化时
 *   推送新快照，订阅即可拿到后续真值。
 * - **独立态/老宿主没有 onHostStateChange**：不判 `typeof` 直接调用会在 8084
 *   直开时崩，故先判函数再订阅。
 * - 退订必须被调用（见 main.tsx 的 unmount / render 重入），否则 qiankun 反复
 *   挂载会堆积监听器。
 */
export function bindHostPermissions(props: PermissionHostProps): () => void {
  setPermissions(props.permissions);

  const onHostStateChange = props.onHostStateChange;
  if (typeof onHostStateChange !== 'function') return () => {};

  const subscribeHost = onHostStateChange as (
    listener: (snapshot: PermissionSnapshot) => void,
  ) => unknown;

  const unsubscribe = subscribeHost((snapshot) => {
    // 只在快照确实携带 permissions 时改写（宿主 snapshot() 恒带该字段；
    // 老宿主推送的窄快照不该把已有的权限抹成「独立态」）
    if (snapshot && typeof snapshot === 'object' && 'permissions' in snapshot) {
      setPermissions(snapshot.permissions);
    }
  });

  return typeof unsubscribe === 'function'
    ? (unsubscribe as () => void)
    : () => {};
}
