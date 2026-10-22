import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../../../icons/app-icon';

interface LockScreenModalProps {
  avatar?: string;
  text?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmit?: (password: string) => void;
}

function AvatarFallback() {
  return (
    <div className="avatar avatar-placeholder">
      <div className="flex-center bg-primary/15 text-primary w-20 rounded-full">
        <AppIcon name="user" className="size-8" />
      </div>
    </div>
  );
}

export function LockScreenModal({
  avatar = '',
  text = '',
  open = false,
  onOpenChange,
  onSubmit,
}: LockScreenModalProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPassword('');
      setError(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  function handleSubmit() {
    if (!password) {
      setError(true);
      return;
    }
    onSubmit?.(password);
    onOpenChange?.(false);
  }

  if (!open) return null;

  return createPortal(
    <div
      className="modal modal-open modal-middle"
      onClick={() => onOpenChange?.(false)}
    >
      <div className="modal-box max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-foreground text-lg font-semibold">
          {t('widgets.lockScreen.title')}
        </h3>
        <div
          className="mb-10 flex w-full flex-col items-center px-10"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmit();
            }
          }}
        >
          <div className="w-full">
            <div className="ml-2 flex w-full flex-col items-center">
              {avatar ? (
                <div className="avatar">
                  <div className="w-20 rounded-full">
                    <img src={avatar} alt={text} />
                  </div>
                </div>
              ) : (
                <AvatarFallback />
              )}
              <div className="text-foreground my-6 flex items-center font-medium">
                {text}
              </div>
            </div>
            <input
              ref={inputRef}
              type="password"
              name="lockScreenPassword"
              className={[
                'input input-bordered w-full',
                error ? 'input-error' : '',
              ].join(' ')}
              placeholder={t('widgets.lockScreen.passwordPlaceholder')}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
            />
            <button
              className="btn btn-primary mt-6 w-full"
              onClick={handleSubmit}
            >
              {t('widgets.lockScreen.unlock')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
