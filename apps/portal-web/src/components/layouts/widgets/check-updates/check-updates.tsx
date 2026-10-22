import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

interface CheckUpdatesProps {
  checkUpdatesInterval?: number;

  checkUpdateUrl?: string;
}

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
