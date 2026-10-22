import { useTranslation } from 'react-i18next';
import { SwitchItem } from '../switch-item';
import { ToggleItem } from '@zanelab/ui';

interface NavigationProps {
  disabled?: boolean;
  disabledNavigationSplit?: boolean;
  navigationStyleType: string;
  onNavigationStyleTypeChange: (value: string) => void;
  navigationSplit: boolean;
  onNavigationSplitChange: (value: boolean) => void;
  navigationAccordion: boolean;
  onNavigationAccordionChange: (value: boolean) => void;
}

export function Navigation({
  disabled,
  disabledNavigationSplit,
  navigationStyleType,
  onNavigationStyleTypeChange,
  navigationSplit,
  onNavigationSplitChange,
  navigationAccordion,
  onNavigationAccordionChange,
}: NavigationProps) {
  const { t } = useTranslation();
  return (
    <>
      <ToggleItem
        value={navigationStyleType}
        onChange={onNavigationStyleTypeChange}
        disabled={disabled}
        items={[
          {
            label: t('preferences.navigation.styles.rounded'),
            value: 'rounded',
          },
          { label: t('preferences.navigation.styles.plain'), value: 'plain' },
        ]}
      >
        {t('preferences.navigation.styleLabel')}
      </ToggleItem>
      <SwitchItem
        value={navigationSplit}
        onChange={onNavigationSplitChange}
        disabled={disabledNavigationSplit || disabled}
        tip={t('preferences.navigation.splitTip')}
      >
        {t('preferences.navigation.split')}
      </SwitchItem>
      <SwitchItem
        value={navigationAccordion}
        onChange={onNavigationAccordionChange}
        disabled={disabled}
      >
        {t('preferences.navigation.accordion')}
      </SwitchItem>
    </>
  );
}
