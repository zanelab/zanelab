import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { AppIcon } from '../../../icons/app-icon';
import { useOpenPreferences } from './use-open-preferences';
import { PreferencesDrawer } from './preferences-drawer';

export function PreferencesButton({
  /** 清空偏好并登出（清空缓存并登出按钮） */
  onClearPreferencesAndLogout,
  /** 根元素 class（等价 reference 的 Vue class 透传，header 传 mr-1） */
  className = '',
}: {
  onClearPreferencesAndLogout?: () => void;

  className?: string;
}) {
  const { t } = useTranslation();
  const { openPreferences, setOpenPreferences } = useOpenPreferences();

  return (
    <>
      <button
        className={`btn btn-ghost btn-sm btn-square hover:animate-[shrink_0.3s_ease-in-out] ${className}`}
        onClick={() => setOpenPreferences(true)}
        title={t('widgets.preferencesButton')}
      >
        <AppIcon name="settings" className="text-base-content size-4" />
      </button>
      {openPreferences &&
        createPortal(
          <PreferencesDrawer
            onClose={() => setOpenPreferences(false)}
            onClearPreferencesAndLogout={onClearPreferencesAndLogout}
          />,
          document.body,
        )}
    </>
  );
}
