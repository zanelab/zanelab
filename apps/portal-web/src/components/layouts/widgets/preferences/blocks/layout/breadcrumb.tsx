import { useTranslation } from 'react-i18next';
import { SwitchItem } from '../switch-item';
import { ToggleItem } from '@zanelab/ui';

interface BreadcrumbProps {
  disabled?: boolean;
  breadcrumbEnable: boolean;
  onBreadcrumbEnableChange: (value: boolean) => void;
  breadcrumbHideOnlyOne: boolean;
  onBreadcrumbHideOnlyOneChange: (value: boolean) => void;
  breadcrumbShowIcon: boolean;
  onBreadcrumbShowIconChange: (value: boolean) => void;
  breadcrumbShowHome: boolean;
  onBreadcrumbShowHomeChange: (value: boolean) => void;
  breadcrumbStyleType: string;
  onBreadcrumbStyleTypeChange: (value: string) => void;
}

export function Breadcrumb({
  disabled,
  breadcrumbEnable,
  onBreadcrumbEnableChange,
  breadcrumbHideOnlyOne,
  onBreadcrumbHideOnlyOneChange,
  breadcrumbShowIcon,
  onBreadcrumbShowIconChange,
  breadcrumbShowHome,
  onBreadcrumbShowHomeChange,
  breadcrumbStyleType,
  onBreadcrumbStyleTypeChange,
}: BreadcrumbProps) {
  const { t } = useTranslation();
  const disableItem = !breadcrumbEnable || disabled;

  return (
    <>
      <SwitchItem
        value={breadcrumbEnable}
        onChange={onBreadcrumbEnableChange}
        disabled={disabled}
      >
        {t('preferences.breadcrumb.enable')}
      </SwitchItem>
      <SwitchItem
        value={breadcrumbHideOnlyOne}
        onChange={onBreadcrumbHideOnlyOneChange}
        disabled={disableItem}
      >
        {t('preferences.breadcrumb.hideOnlyOne')}
      </SwitchItem>
      <SwitchItem
        value={breadcrumbShowIcon}
        onChange={onBreadcrumbShowIconChange}
        disabled={disableItem}
      >
        {t('preferences.breadcrumb.showIcon')}
      </SwitchItem>
      <SwitchItem
        value={breadcrumbShowHome}
        onChange={onBreadcrumbShowHomeChange}
        disabled={disableItem || !breadcrumbShowIcon}
      >
        {t('preferences.breadcrumb.showHome')}
      </SwitchItem>
      <ToggleItem
        value={breadcrumbStyleType}
        onChange={onBreadcrumbStyleTypeChange}
        disabled={disableItem}
        items={[
          { label: t('preferences.breadcrumb.styles.normal'), value: 'normal' },
          {
            label: t('preferences.breadcrumb.styles.background'),
            value: 'background',
          },
        ]}
      >
        {t('preferences.breadcrumb.styleLabel')}
      </ToggleItem>
    </>
  );
}
