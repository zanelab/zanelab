import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { AppIcon } from '../../../icons/app-icon';
import { PreferencesDrawer } from './preferences-drawer';

interface PreferencesProps {
  showButton?: boolean;
  children?: React.ReactNode;

  /** 清空偏好并登出（清空缓存并登出按钮） */
  onClearPreferencesAndLogout?: () => void;
}

export function Preferences({
  showButton = true,
  children,
  onClearPreferencesAndLogout,
}: PreferencesProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div>
      {open &&
        createPortal(
          <PreferencesDrawer
            onClose={() => setOpen(false)}
            onClearPreferencesAndLogout={onClearPreferencesAndLogout}
          />,
          document.body,
        )}

      {children ? (
        <span onClick={() => setOpen(true)}>{children}</span>
      ) : showButton ? (
        <button
          title={t('widgets.preferencesButton')}
          className="bg-primary text-primary-content flex size-10 cursor-pointer items-center justify-center rounded-l-lg rounded-r-none border-none"
          onClick={() => setOpen(true)}
        >
          <AppIcon name="settings" className="size-5" />
        </button>
      ) : null}
    </div>
  );
}
