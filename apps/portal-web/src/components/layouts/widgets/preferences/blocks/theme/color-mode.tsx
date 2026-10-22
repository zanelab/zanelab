import { useTranslation } from 'react-i18next';
import { SwitchItem } from '../switch-item';

interface ColorModeProps {
  appColorWeakMode: boolean;
  onAppColorWeakModeChange: (v: boolean) => void;
  appColorGrayMode: boolean;
  onAppColorGrayModeChange: (v: boolean) => void;
}

export function ColorMode({
  appColorWeakMode,
  onAppColorWeakModeChange,
  appColorGrayMode,
  onAppColorGrayModeChange,
}: ColorModeProps) {
  const { t } = useTranslation();
  return (
    <div>
      <SwitchItem value={appColorGrayMode} onChange={onAppColorGrayModeChange}>
        {t('preferences.theme.grayMode')}
      </SwitchItem>
      <SwitchItem value={appColorWeakMode} onChange={onAppColorWeakModeChange}>
        {t('preferences.theme.colorWeakMode')}
      </SwitchItem>
    </div>
  );
}
