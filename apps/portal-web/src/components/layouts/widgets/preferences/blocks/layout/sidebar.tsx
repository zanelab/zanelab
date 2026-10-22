import { useTranslation } from 'react-i18next';
import { SwitchItem } from '../switch-item';
import { NumberFieldItem } from '../number-field-item';
import { CheckboxItem } from '../checkbox-item';

interface SidebarProps {
  currentLayout?: string;
  disabled: boolean;
  sidebarEnable: boolean;
  onSidebarEnableChange: (value: boolean) => void;
  sidebarDraggable: boolean;
  onSidebarDraggableChange: (value: boolean) => void;
  sidebarCollapsed: boolean;
  onSidebarCollapsedChange: (value: boolean) => void;
  sidebarExpandOnHover: boolean;
  onSidebarExpandOnHoverChange: (value: boolean) => void;
  sidebarCollapsedShowTitle: boolean;
  onSidebarCollapsedShowTitleChange: (value: boolean) => void;
  sidebarAutoActivateChild: boolean;
  onSidebarAutoActivateChildChange: (value: boolean) => void;
  sidebarButtons: string[];
  onSidebarButtonsChange: (value: string[]) => void;
  sidebarWidth: number;
  onSidebarWidthChange: (value: number) => void;
}

export function Sidebar({
  currentLayout,
  disabled,
  sidebarEnable,
  onSidebarEnableChange,
  sidebarDraggable,
  onSidebarDraggableChange,
  sidebarCollapsed,
  onSidebarCollapsedChange,
  sidebarExpandOnHover,
  onSidebarExpandOnHoverChange,
  sidebarCollapsedShowTitle,
  onSidebarCollapsedShowTitleChange,
  sidebarAutoActivateChild,
  onSidebarAutoActivateChildChange,
  sidebarButtons,
  onSidebarButtonsChange,
  sidebarWidth,
  onSidebarWidthChange,
}: SidebarProps) {
  const { t } = useTranslation();
  return (
    <>
      <SwitchItem
        value={sidebarEnable}
        onChange={onSidebarEnableChange}
        disabled={disabled}
      >
        {t('preferences.sidebar.enable')}
      </SwitchItem>
      <SwitchItem
        value={sidebarDraggable}
        onChange={onSidebarDraggableChange}
        disabled={!sidebarEnable || disabled}
      >
        {t('preferences.sidebar.draggable')}
      </SwitchItem>
      <SwitchItem
        value={sidebarCollapsed}
        onChange={onSidebarCollapsedChange}
        disabled={!sidebarEnable || disabled}
      >
        {t('preferences.sidebar.collapsed')}
      </SwitchItem>
      <SwitchItem
        value={sidebarExpandOnHover}
        onChange={onSidebarExpandOnHoverChange}
        disabled={!sidebarEnable || disabled || !sidebarCollapsed}
        tip={t('preferences.sidebar.expandOnHoverTip')}
      >
        {t('preferences.sidebar.expandOnHover')}
      </SwitchItem>
      <SwitchItem
        value={sidebarCollapsedShowTitle}
        onChange={onSidebarCollapsedShowTitleChange}
        disabled={!sidebarEnable || disabled || !sidebarCollapsed}
      >
        {t('preferences.sidebar.collapsedShowTitle')}
      </SwitchItem>
      <SwitchItem
        value={sidebarAutoActivateChild}
        onChange={onSidebarAutoActivateChildChange}
        disabled={
          !sidebarEnable ||
          !['sidebar-mixed-nav', 'mixed-nav', 'header-mixed-nav'].includes(
            currentLayout || '',
          ) ||
          disabled
        }
        tip={t('preferences.sidebar.autoActivateChildTip')}
      >
        {t('preferences.sidebar.autoActivateChild')}
      </SwitchItem>
      <CheckboxItem
        items={[
          {
            label: t('preferences.sidebar.buttons.collapsed'),
            value: 'collapsed',
          },
          { label: t('preferences.sidebar.buttons.fixed'), value: 'fixed' },
        ]}
        value={sidebarButtons}
        onChange={onSidebarButtonsChange}
      >
        {t('preferences.sidebar.buttonsLabel')}
      </CheckboxItem>
      <NumberFieldItem
        value={sidebarWidth}
        onChange={onSidebarWidthChange}
        disabled={!sidebarEnable || disabled}
        min={160}
        max={320}
        step={10}
      >
        {t('preferences.sidebar.width')}
      </NumberFieldItem>
    </>
  );
}
