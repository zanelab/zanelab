import { useEffect, useState } from 'react';
import { notify, type NotifyMessage } from '@zanelab/utils';

const ALERT_MODIFIER: Record<NotifyMessage['level'], string> = {
  success: 'alert-success',
  error: 'alert-error',
  warning: 'alert-warning',
  info: 'alert-info',
};

const AUTO_DISMISS_MS = 3000;

export function ToastRegion() {
  const [items, setItems] = useState<NotifyMessage[]>([]);

  useEffect(() => {
    const timers = new Map<number, ReturnType<typeof setTimeout>>();
    const unsubscribe = notify.subscribe((msg) => {
      setItems((prev) => [...prev, msg]);
      timers.set(
        msg.id,
        setTimeout(() => {
          setItems((prev) => prev.filter((item) => item.id !== msg.id));
          timers.delete(msg.id);
        }, AUTO_DISMISS_MS),
      );
    });
    return () => {
      unsubscribe();
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="toast toast-top toast-center z-1000" aria-live="polite">
      {items.map((item) => (
        <div
          key={item.id}
          role="alert"
          className={`alert ${ALERT_MODIFIER[item.level]}`}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
