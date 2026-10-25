import { useEffect, useRef, useState } from 'react';
import { notify, type NotifyMessage } from '@zanelab/utils';

const ALERT_MODIFIER: Record<NotifyMessage['level'], string> = {
  success: 'alert-success',
  error: 'alert-error',
  warning: 'alert-warning',
  info: 'alert-info',
};

const AUTO_DISMISS_MS = 3000;
// 离场动画时长：到点后从 items/leaving 中移除节点
const LEAVE_MS = 200;

export function ToastRegion() {
  const [items, setItems] = useState<NotifyMessage[]>([]);
  const [leaving, setLeaving] = useState<Set<number>>(new Set());
  // timer 存 ref：StrictMode 下 effect 会 跑→清→重跑，闭包内的 Map 会在
  // cleanup 时被清掉，而 pending 补发只发生一次（subscribe 内 splice），
  // 重跑的 effect 不会重设 timer——补发的 toast 就永远不消失。
  const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    // 不用 alive 守卫 setItems：StrictMode 下 effect 跑→清→重跑共用同一
    // timersRef，但 timer 回调持有创建时的闭包——若被首轮 alive=false 拦截，
    // 补发 toast（boot 阶段 502 等）就永久残留。React 18+ 卸载后再 setItems
    // 是 no-op，无需守卫；也不在 cleanup 里 clearTimeout，让首轮 timer 存活。
    const unsubscribe = notify.subscribe((msg) => {
      setItems((prev) =>
        prev.some((item) => item.id === msg.id) ? prev : [...prev, msg],
      );
      if (timersRef.current.has(msg.id)) return;
      timersRef.current.set(
        msg.id,
        setTimeout(() => {
          timersRef.current.delete(msg.id);
          // 先进离场动画，动画结束后再摘节点
          setLeaving((prev) => new Set(prev).add(msg.id));
          timersRef.current.set(
            msg.id,
            setTimeout(() => {
              timersRef.current.delete(msg.id);
              setLeaving((prev) => {
                const next = new Set(prev);
                next.delete(msg.id);
                return next;
              });
              setItems((prev) => prev.filter((item) => item.id !== msg.id));
            }, LEAVE_MS),
          );
        }, AUTO_DISMISS_MS),
      );
    });
    return unsubscribe;
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="toast toast-top toast-center z-1000" aria-live="polite">
      {items.map((item) => (
        <div
          key={item.id}
          role="alert"
          className={`alert ${ALERT_MODIFIER[item.level]} ${
            leaving.has(item.id) ? 'toast-region-leave' : 'toast-region-enter'
          }`}
        >
          {item.message}
        </div>
      ))}
      <style>{`
        @keyframes toast-region-enter {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes toast-region-leave {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-16px); }
        }
        .toast-region-enter { animation: toast-region-enter 0.25s ease-out both; }
        .toast-region-leave { animation: toast-region-leave 0.2s ease-in both; }
      `}</style>
    </div>
  );
}
