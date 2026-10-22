import { useTranslation } from 'react-i18next';
import { SwitchItem } from '../switch-item';

interface FooterProps {
  footerEnable: boolean;
  onFooterEnableChange: (v: boolean) => void;
  footerFixed: boolean;
  onFooterFixedChange: (v: boolean) => void;
}

export function Footer({
  footerEnable,
  onFooterEnableChange,
  footerFixed,
  onFooterFixedChange,
}: FooterProps) {
  const { t } = useTranslation();
  return (
    <div>
      <SwitchItem value={footerEnable} onChange={onFooterEnableChange}>
        {t('preferences.footer.enable')}
      </SwitchItem>
      <SwitchItem
        value={footerFixed}
        onChange={onFooterFixedChange}
        disabled={!footerEnable}
      >
        {t('preferences.footer.fixed')}
      </SwitchItem>
    </div>
  );
}
