import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NotificationItem } from './types';
import { AnchoredPortal } from '@zanelab/ui';
import { AppIcon } from '../../../icons/app-icon';

interface NotificationProps {
  /** 显示圆点 */
  dot?: boolean;

  /** 消息列表 */
  notifications?: NotificationItem[];
  onClear?: () => void;
  onMakeAll?: () => void;
  onClick?: (item: NotificationItem) => void;
  onRead?: (item: NotificationItem) => void;
  onRemove?: (item: NotificationItem) => void;
  onViewAll?: () => void;
}

/**
 * Notification — 1:1 port of widgets/notification/notification.vue.
 * 默认空列表（reference: notifications: () => []）。
 * Popover with mark-all-read, per-item read/remove actions, clear + view all.
 */
export function Notification({
  dot = false,
  notifications = [],
  onClear,
  onMakeAll,
  onClick,
  onRead,
  onRemove,
  onViewAll,
}: NotificationProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const close = () => setOpen(false);

  const handleViewAll = () => {
    onViewAll?.();
    close();
  };

  return (
    <div className="relative mr-2" ref={anchorRef}>
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-circle bell-button text-foreground relative"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        {dot ? (
          <span className="bg-primary absolute top-0.5 right-0.5 size-2 rounded-full" />
        ) : null}
        <AppIcon name="bell" className="size-4" />
      </button>

      <AnchoredPortal
        open={open}
        anchorRef={anchorRef}
        onClose={close}
        offsetX={-8}
      >
        <div className="border-base-300 bg-base-100 w-90 rounded-lg border p-0 shadow-lg">
          <div className="flex items-center justify-between p-4 py-3">
            <div className="text-foreground">
              {t('widgets.notification.title')}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square"
              title={t('widgets.notification.markAllRead')}
              disabled={notifications.length <= 0}
              onClick={() => onMakeAll?.()}
            >
              <AppIcon name="mail-check" className="size-4" />
            </button>
          </div>

          {notifications.length > 0 ? (
            <div className="max-h-90 overflow-y-auto">
              <ul className="flex! w-full flex-col">
                {notifications.map((item) => (
                  <li
                    key={item.id ?? item.title}
                    className="border-base-300 hover:bg-base-200 relative flex w-full cursor-pointer items-start gap-5 border-t p-3"
                    onClick={() => onClick?.(item)}
                  >
                    {!item.isRead ? (
                      <span className="bg-primary absolute top-2 right-2 size-2 rounded-sm" />
                    ) : null}

                    <span className="avatar relative flex size-10 shrink-0 overflow-hidden rounded-full">
                      {item.avatar ? (
                        <img
                          src={item.avatar}
                          className="aspect-square size-full object-cover"
                        />
                      ) : (
                        <span className="bg-primary/15 text-primary flex size-full items-center justify-center">
                          <AppIcon name="user" className="size-5" />
                        </span>
                      )}
                    </span>
                    <div className="flex flex-col gap-1 leading-none">
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-base-content/60 my-1 line-clamp-2 text-xs">
                        {item.message}
                      </p>
                      <p className="text-base-content/60 line-clamp-2 text-xs">
                        {item.date}
                      </p>
                    </div>
                    <div className="absolute top-1/2 right-3 flex -translate-y-1/2 flex-row gap-1">
                      {!item.isRead ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs h-6 px-2"
                          title={t('widgets.notification.markRead')}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRead?.(item);
                          }}
                        >
                          <AppIcon name="circle-check-big" className="size-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-error h-6 px-2"
                          title={t('widgets.notification.remove')}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove?.(item);
                          }}
                        >
                          <AppIcon name="circle-x" className="size-4" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex-center text-base-content/60 min-h-37.5 w-full">
              {t('common.noData')}
            </div>
          )}

          <div className="border-base-300 flex items-center justify-between border-t px-4 py-3">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={notifications.length <= 0}
              onClick={() => onClear?.()}
            >
              {t('widgets.notification.clear')}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleViewAll}
            >
              {t('widgets.notification.viewAll')}
            </button>
          </div>
        </div>
      </AnchoredPortal>
    </div>
  );
}
