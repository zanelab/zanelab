import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

interface CheckUpdatesProps {
  /** 轮询时间，分钟 */
  checkUpdatesInterval?: number;

  /** 检查更新的地址 */
  checkUpdateUrl?: string;
}

/**
 * CheckUpdates — polls the app entry for a new version (etag/last-modified)
 * and prompts the user to refresh when it changes.
 * React port of widgets/check-updates/check-updates.vue
 */
export function CheckUpdates({
  checkUpdatesInterval = 1,
  checkUpdateUrl = import.meta.env.BASE_URL || '/',
}: CheckUpdatesProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const isCheckingUpdatesRef = useRef(false);
  const currentVersionTagRef = useRef('');
  const lastVersionTagRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );

  async function getVersionTag(): Promise<string | null> {
    try {
      if (
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1'
      ) {
        return null;
      }
      const response = await fetch(checkUpdateUrl, {
        cache: 'no-cache',
        method: 'HEAD',
        redirect: 'manual',
      });

      return (
        response.headers.get('etag') || response.headers.get('last-modified')
      );
    } catch {
      console.error('Failed to fetch version tag');
      return null;
    }
  }

  async function checkForUpdates() {
    const versionTag = await getVersionTag();
    if (!versionTag) {
      return;
    }

    if (!lastVersionTagRef.current) {
      // 首次运行时不提示更新
      lastVersionTagRef.current = versionTag;
      return;
    }

    if (lastVersionTagRef.current !== versionTag && versionTag) {
      if (timerRef.current) clearInterval(timerRef.current);
      handleNotice(versionTag);
    }
  }

  function handleNotice(versionTag: string) {
    currentVersionTagRef.current = versionTag;
    setOpen(true);
  }

  function start() {
    if (checkUpdatesInterval <= 0) {
      return;
    }

    // 每 checkUpdatesInterval(默认值为1) 分钟检查一次
    timerRef.current = setInterval(
      checkForUpdates,
      checkUpdatesInterval * 60 * 1000,
    );
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function handleVisibilitychange() {
    if (document.hidden) {
      stop();
    } else if (!isCheckingUpdatesRef.current) {
      isCheckingUpdatesRef.current = true;
      checkForUpdates().finally(() => {
        isCheckingUpdatesRef.current = false;
        start();
      });
    }
  }

  useEffect(() => {
    start();
    document.addEventListener('visibilitychange', handleVisibilitychange);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibilitychange);
    };
  }, []);

  function handleConfirm() {
    lastVersionTagRef.current = currentVersionTagRef.current;
    window.location.reload();
  }

  if (!open) return null;

  // portal 到 body：全屏 overlay 不应依赖挂载祖先恰好无 stacking context
  // （当前挂在 layout 根部 relative 容器才没被侧边栏盖住，见层级修复先例）。
  return createPortal(
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="text-lg font-semibold">
          {t('widgets.checkUpdates.title')}
        </h3>
        <p className="text-base-content/70 min-h-10 py-4 text-sm">
          {t('widgets.checkUpdates.description')}
        </p>
        <div className="modal-action">
          <button className="btn btn-sm" onClick={() => setOpen(false)}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleConfirm}>
            {t('widgets.checkUpdates.refresh')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
