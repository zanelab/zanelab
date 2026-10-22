import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useTimezoneStore } from '../../../../stores/timezone-store';
import type { TimezoneOption } from '../../../../stores/timezone-store';
import { AppIcon } from '../../../icons/app-icon';

export function TimezoneButton({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const timezone = useTimezoneStore((s) => s.timezone);
  const setTimezone = useTimezoneStore((s) => s.setTimezone);
  const getTimezoneOptions = useTimezoneStore((s) => s.getTimezoneOptions);

  const [open, setOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [selected, setSelected] = useState<string | undefined>();
  const [options, setOptions] = useState<TimezoneOption[]>([]);

  useEffect(() => {
    if (!open) return;
    setSelected(timezone);
    let cancelled = false;
    getTimezoneOptions().then((list) => {
      if (!cancelled) setOptions(list);
    });
    return () => {
      cancelled = true;
    };
  }, [open, timezone, getTimezoneOptions]);

  const handleConfirm = async () => {
    try {
      setConfirmLoading(true);
      if (selected) {
        await setTimezone(selected);
      }
      setOpen(false);
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`btn btn-ghost btn-sm btn-square hover:animate-[shrink_0.3s_ease-in-out] ${className}`}
        title={t('widgets.timezone.title')}
        onClick={() => setOpen(true)}
      >
        <AppIcon name="world-clock" className="text-foreground size-4" />
      </button>

      {open &&
        createPortal(
          <dialog className="modal modal-open" onClick={() => setOpen(false)}>
            <div
              className="modal-box max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold">
                {t('widgets.timezone.title')}
              </h3>
              <div className="timezone-container py-4">
                <div className="flex flex-col gap-2">
                  {options.map((item) => (
                    <label
                      key={`container${item.value}`}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <input
                        type="radio"
                        name="timezone"
                        className="radio radio-sm"
                        value={item.value}
                        checked={selected === item.value}
                        onChange={(e) => setSelected(e.target.value)}
                      />
                      <span className="cursor-pointer text-sm">
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setOpen(false)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={confirmLoading}
                  onClick={handleConfirm}
                >
                  {confirmLoading ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : null}
                  {t('common.confirm')}
                </button>
              </div>
            </div>
          </dialog>,
          document.body,
        )}
    </>
  );
}
