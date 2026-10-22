import { useTranslation } from 'react-i18next';
import { SwitchItem } from '../switch-item';
import { SelectItem } from '../select-item';

interface AnimationProps {
  transitionProgress: boolean;
  onTransitionProgressChange: (v: boolean) => void;
  transitionName: string;
  onTransitionNameChange: (v: string) => void;
  transitionEnable: boolean;
  onTransitionEnableChange: (v: boolean) => void;
  transitionLoading: boolean;
  onTransitionLoadingChange: (v: boolean) => void;
}

export function Animation({
  transitionProgress,
  onTransitionProgressChange,
  transitionName,
  onTransitionNameChange,
  transitionEnable,
  onTransitionEnableChange,
  transitionLoading,
  onTransitionLoadingChange,
}: AnimationProps) {
  const { t } = useTranslation();
  return (
    <div>
      <SwitchItem value={transitionEnable} onChange={onTransitionEnableChange}>
        {t('preferences.animation.enable')}
      </SwitchItem>
      <SwitchItem
        value={transitionProgress}
        onChange={onTransitionProgressChange}
      >
        {t('preferences.animation.progress')}
      </SwitchItem>
      <SwitchItem
        value={transitionLoading}
        onChange={onTransitionLoadingChange}
      >
        {t('preferences.animation.loading')}
      </SwitchItem>
      <SelectItem
        value={transitionName}
        onChange={onTransitionNameChange}
        items={[
          {
            label: t('preferences.animation.effects.fadeSlide'),
            value: 'fade-slide',
          },
          { label: t('preferences.animation.effects.fade'), value: 'fade' },
          { label: t('preferences.animation.effects.zoom'), value: 'zoom' },
        ]}
      >
        {t('preferences.animation.effect')}
      </SelectItem>
    </div>
  );
}
