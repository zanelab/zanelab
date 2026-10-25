// 轻量「通知」模块：拦截器等非 React 环境经此把消息交给根组件 ToastRegion 渲染。
// 业务代码与拦截器里一律 notify.* ，不直接用组件库 message（spec/http-api-guidelines.md）。
//
// 暂存机制（09-24）：boot 阶段 main.tsx 是 `await restoreSession()`（内含
// getUserPer / fetchMenus，会 401/503/网络错误）**先于** renderApp() 执行，
// 那时 ToastRegion 还没挂载 → listeners 为空。若直接丢弃，登录态问题、服务器
// 异常等首屏错误提示会静默消失（如 getUserPer 503 只返回 nginx HTML 时用户
// 看不到任何提示）。故无订阅者时先入队，subscribe 时补发。
export type NotifyLevel = 'success' | 'error' | 'warning' | 'info';

export interface NotifyMessage {
  id: number;
  level: NotifyLevel;
  message: string;
}

type Listener = (msg: NotifyMessage) => void;

/** 无订阅者期间暂存的提示上限（只保留最近若干条，避免刷屏堆积） */
const PENDING_LIMIT = 5;

let seq = 0;
const listeners = new Set<Listener>();
const pending: NotifyMessage[] = [];

function publish(level: NotifyLevel, message: string) {
  const msg: NotifyMessage = { id: ++seq, level, message };
  if (listeners.size === 0) {
    // 无订阅者（ToastRegion 未挂载）→ 暂存，订阅时补发
    pending.push(msg);
    if (pending.length > PENDING_LIMIT) pending.shift();
    return;
  }
  listeners.forEach((listener) => listener(msg));
}

export const notify = {
  error(message: string) {
    publish('error', message);
  },
  success(message: string) {
    publish('success', message);
  },
  warning(message: string) {
    publish('warning', message);
  },
  info(message: string) {
    publish('info', message);
  },

  /** 订阅；返回取消订阅函数（组件 effect 内使用）。订阅时补发暂存消息（先入先出）。 */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    if (pending.length > 0) {
      const backlog = pending.splice(0, pending.length);
      backlog.forEach((msg) => listener(msg));
    }
    return () => {
      listeners.delete(listener);
    };
  },
};
