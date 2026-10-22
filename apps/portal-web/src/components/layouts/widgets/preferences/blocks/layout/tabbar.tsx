import { useTranslation } from 'react-i18next';
import { SwitchItem } from '../switch-item';
import { SelectItem } from '../select-item';
import { NumberFieldItem } from '../number-field-item';

interface TabbarProps {
  disabled?: boolean;
  tabbarEnable: boolean;
  onTabbarEnableChange: (value: boolean) => void;
  tabbarPersist: boolean;
  onTabbarPersistChange: (value: boolean) => void;
  tabbarVisitHistory: boolean;
  onTabbarVisitHistoryChange: (value: boolean) => void;
  tabbarDraggable: boolean;
  onTabbarDraggableChange: (value: boolean) => void;
  tabbarWheelable: boolean;
  onTabbarWheelableChange: (value: boolean) => void;
  tabbarShowIcon: boolean;
  onTabbarShowIconChange: (value: boolean) => void;
  tabbarShowMore: boolean;
  onTabbarShowMoreChange: (value: boolean) => void;
  tabbarShowMaximize: boolean;
  onTabbarShowMaximizeChange: (value: boolean) => void;
  tabbarStyleType: string;
  onTabbarStyleTypeChange: (value: string) => void;
  tabbarMaxCount: number;
  onTabbarMaxCountChange: (value: number) => void;
  tabbarMiddleClickToClose: boolean;
  onTabbarMiddleClickToCloseChange: (value: boolean) => void;
}

export function Tabbar({
  tabbarEnable,
  onTabbarEnableChange,
  tabbarPersist,
  onTabbarPersistChange,
  tabbarVisitHistory,
  onTabbarVisitHistoryChange,
  tabbarDraggable,
  onTabbarDraggableChange,
  tabbarWheelable,
  onTabbarWheelableChange,
  tabbarShowIcon,
  onTabbarShowIconChange,
  tabbarShowMore,
  onTabbarShowMoreChange,
  tabbarShowMaximize,
  onTabbarShowMaximizeChange,
  tabbarStyleType,
  onTabbarStyleTypeChange,
  tabbarMaxCount,
  onTabbarMaxCountChange,
  tabbarMiddleClickToClose,
  onTabbarMiddleClickToCloseChange,
}: TabbarProps) {
  const { t } = useTranslation();
  return (
    <>
      <SwitchItem value={tabbarEnable} onChange={onTabbarEnableChange}>
        {t('preferences.tabbar.enable')}
      </SwitchItem>
      <SwitchItem
        value={tabbarPersist}
        onChange={onTabbarPersistChange}
        disabled={!tabbarEnable}
      >
        {t('preferences.tabbar.persist')}
      </SwitchItem>
      <SwitchItem
        value={tabbarVisitHistory}
        onChange={onTabbarVisitHistoryChange}
        disabled={!tabbarEnable}
        tip={t('preferences.tabbar.visitHistoryTip')}
      >
        {t('preferences.tabbar.visitHistory')}
      </SwitchItem>
      <NumberFieldItem
        value={tabbarMaxCount}
        onChange={onTabbarMaxCountChange}
        disabled={!tabbarEnable}
        min={0}
        max={30}
        step={5}
        tip={t('preferences.tabbar.maxCountTip')}
      >
        {t('preferences.tabbar.maxCount')}
      </NumberFieldItem>
      <SwitchItem
        value={tabbarDraggable}
        onChange={onTabbarDraggableChange}
        disabled={!tabbarEnable}
      >
        {t('preferences.tabbar.draggable')}
      </SwitchItem>
      <SwitchItem
        value={tabbarWheelable}
        onChange={onTabbarWheelableChange}
        disabled={!tabbarEnable}
        tip={t('preferences.tabbar.wheelableTip')}
      >
        {t('preferences.tabbar.wheelable')}
      </SwitchItem>
      <SwitchItem
        value={tabbarMiddleClickToClose}
        onChange={onTabbarMiddleClickToCloseChange}
        disabled={!tabbarEnable}
      >
        {t('preferences.tabbar.middleClickToClose')}
      </SwitchItem>
      <SwitchItem
        value={tabbarShowIcon}
        onChange={onTabbarShowIconChange}
        disabled={!tabbarEnable}
      >
        {t('preferences.tabbar.showIcon')}
      </SwitchItem>
      <SwitchItem
        value={tabbarShowMore}
        onChange={onTabbarShowMoreChange}
        disabled={!tabbarEnable}
      >
        {t('preferences.tabbar.showMore')}
      </SwitchItem>
      <SwitchItem
        value={tabbarShowMaximize}
        onChange={onTabbarShowMaximizeChange}
        disabled={!tabbarEnable}
      >
        {t('preferences.tabbar.showMaximize')}
      </SwitchItem>
      <SelectItem
        value={tabbarStyleType}
        onChange={onTabbarStyleTypeChange}
        items={[
          { label: t('preferences.tabbar.styles.chrome'), value: 'chrome' },
          { label: t('preferences.tabbar.styles.plain'), value: 'plain' },
          { label: t('preferences.tabbar.styles.card'), value: 'card' },
          { label: t('preferences.tabbar.styles.brisk'), value: 'brisk' },
        ]}
      >
        {t('preferences.tabbar.styleLabel')}
      </SelectItem>
    </>
  );
}
