import { useTranslation } from 'react-i18next';
import { systemName } from '../../../../../../locales/i18n';
import { SwitchItem } from '../switch-item';
import { InputItem } from '../input-item';

interface CopyrightProps {
  disabled: boolean;
  copyrightEnable: boolean;
  onCopyrightEnableChange: (v: boolean) => void;
  copyrightCompanyName: string;
  onCopyrightCompanyNameChange: (v: string) => void;
  copyrightCompanySiteLink: string;
  onCopyrightCompanySiteLinkChange: (v: string) => void;
  copyrightDate: string;
  onCopyrightDateChange: (v: string) => void;
  copyrightIcp: string;
  onCopyrightIcpChange: (v: string) => void;
  copyrightIcpLink: string;
  onCopyrightIcpLinkChange: (v: string) => void;
}

export function Copyright({
  disabled,
  copyrightEnable,
  onCopyrightEnableChange,
  copyrightCompanyName,
  onCopyrightCompanyNameChange,
  copyrightCompanySiteLink,
  onCopyrightCompanySiteLinkChange,
  copyrightDate,
  onCopyrightDateChange,
  copyrightIcp,
  onCopyrightIcpChange,
  copyrightIcpLink,
  onCopyrightIcpLinkChange,
}: CopyrightProps) {
  const { t } = useTranslation();
  return (
    <div className={disabled ? 'pointer-events-none opacity-50' : ''}>
      <SwitchItem
        value={copyrightEnable}
        onChange={onCopyrightEnableChange}
        disabled={disabled}
      >
        {t('preferences.copyright.enable')}
      </SwitchItem>
      <InputItem
        value={copyrightCompanyName}
        onChange={onCopyrightCompanyNameChange}
        disabled={disabled}
        placeholder={systemName()}
      >
        {t('preferences.copyright.companyName')}
      </InputItem>
      <InputItem
        value={copyrightCompanySiteLink}
        onChange={onCopyrightCompanySiteLinkChange}
        disabled={disabled}
      >
        {t('preferences.copyright.companySiteLink')}
      </InputItem>
      <InputItem
        value={copyrightDate}
        onChange={onCopyrightDateChange}
        disabled={disabled}
      >
        {t('preferences.copyright.date')}
      </InputItem>
      <InputItem
        value={copyrightIcp}
        onChange={onCopyrightIcpChange}
        disabled={disabled}
      >
        {t('preferences.copyright.icp')}
      </InputItem>
      <InputItem
        value={copyrightIcpLink}
        onChange={onCopyrightIcpLinkChange}
        disabled={disabled}
      >
        {t('preferences.copyright.icpLink')}
      </InputItem>
    </div>
  );
}
