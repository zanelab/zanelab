import { useTranslation } from 'react-i18next';
import { SelectItem } from '../select-item';
import { SwitchItem } from '../switch-item';
import { InputItem } from '../input-item';

interface GeneralProps {
  appLocale: string;
  onAppLocaleChange: (v: string) => void;
  appTimezone: string;
  onAppTimezoneChange: (v: string) => void;
  appDynamicTitle: boolean;
  onAppDynamicTitleChange: (v: boolean) => void;
  appWatermark: boolean;
  onAppWatermarkChange: (v: boolean) => void;
  appWatermarkContent: string;
  onAppWatermarkContentChange: (v: string) => void;
  appEnableCheckUpdates: boolean;
  onAppEnableCheckUpdatesChange: (v: boolean) => void;
  appEnableCopyPreferences: boolean;
  onAppEnableCopyPreferencesChange: (v: boolean) => void;
}

export function General({
  appLocale,
  onAppLocaleChange,
  appTimezone,
  onAppTimezoneChange,
  appDynamicTitle,
  onAppDynamicTitleChange,
  appWatermark,
  onAppWatermarkChange,
  appWatermarkContent,
  onAppWatermarkContentChange,
  appEnableCheckUpdates,
  onAppEnableCheckUpdatesChange,
  appEnableCopyPreferences,
  onAppEnableCopyPreferencesChange,
}: GeneralProps) {
  const { t } = useTranslation();
  return (
    <div>
      <SelectItem
        value={appLocale}
        onChange={onAppLocaleChange}
        items={[
          { label: '简体中文', value: 'zh-CN' },
          { label: 'English', value: 'en-US' },
        ]}
      >
        {t('preferences.general.language')}
      </SelectItem>
      <SelectItem
        value={appTimezone}
        onChange={onAppTimezoneChange}
        items={[
          { label: 'Asia/Shanghai', value: 'Asia/Shanghai' },
          { label: 'America/New_York', value: 'America/New_York' },
          { label: 'Europe/London', value: 'Europe/London' },
        ]}
      >
        {t('preferences.general.timezone')}
      </SelectItem>
      <SwitchItem value={appDynamicTitle} onChange={onAppDynamicTitleChange}>
        {t('preferences.general.dynamicTitle')}
      </SwitchItem>
      <SwitchItem value={appWatermark} onChange={onAppWatermarkChange}>
        {t('preferences.general.watermark')}
      </SwitchItem>
      {appWatermark && (
        <InputItem
          value={appWatermarkContent}
          onChange={onAppWatermarkContentChange}
        >
          {t('preferences.general.watermarkContent')}
        </InputItem>
      )}
      <SwitchItem
        value={appEnableCheckUpdates}
        onChange={onAppEnableCheckUpdatesChange}
      >
        {t('preferences.general.checkUpdates')}
      </SwitchItem>
      <SwitchItem
        value={appEnableCopyPreferences}
        onChange={onAppEnableCopyPreferencesChange}
      >
        {t('preferences.general.enableCopyPreferences')}
      </SwitchItem>
    </div>
  );
}
