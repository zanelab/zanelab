export type NotifyLevel = 'success' | 'error' | 'warning' | 'info';

export interface NotifyMessage {
  id: number;
  level: NotifyLevel;
  message: string;
}

type Listener = (msg: NotifyMessage) => void;

const PENDING_LIMIT = 5;

let seq = 0;
const listeners = new Set<Listener>();
const pending: NotifyMessage[] = [];

function publish(level: NotifyLevel, message: string) {
  const msg: NotifyMessage = { id: ++seq, level, message };
  if (listeners.size === 0) {
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
