import { useTranslation } from 'react-i18next';
import { SwitchItem } from '../switch-item';
import { SelectItem } from '../select-item';
import { ToggleItem } from '@zanelab/ui';

interface HeaderProps {
  disabled: boolean;
  headerEnable: boolean;
  onHeaderEnableChange: (value: boolean) => void;
  headerMode: string;
  onHeaderModeChange: (value: string) => void;
  headerMenuAlign: string;
  onHeaderMenuAlignChange: (value: string) => void;
}

const MODE_ITEMS = [
  { value: 'static' },
  { value: 'fixed' },
  { value: 'auto' },
  { value: 'auto-scroll' },
];

const ALIGN_ITEMS = [{ value: 'start' }, { value: 'center' }, { value: 'end' }];

export function Header({
  disabled,
  headerEnable,
  onHeaderEnableChange,
  headerMode,
  onHeaderModeChange,
  headerMenuAlign,
  onHeaderMenuAlignChange,
}: HeaderProps) {
  const { t } = useTranslation();
  return (
    <>
      <SwitchItem
        value={headerEnable}
        onChange={onHeaderEnableChange}
        disabled={disabled}
      >
        {t('preferences.header.enable')}
      </SwitchItem>
      <SelectItem
        value={headerMode}
        onChange={onHeaderModeChange}
        disabled={!headerEnable}
        items={MODE_ITEMS.map((i) => ({
          ...i,
          label: t(`preferences.header.modes.${i.value}`),
        }))}
      >
        {t('preferences.header.mode')}
      </SelectItem>
      <ToggleItem
        value={headerMenuAlign}
        onChange={onHeaderMenuAlignChange}
        disabled={!headerEnable}
        items={ALIGN_ITEMS.map((i) => ({
          ...i,
          label: t(`preferences.header.aligns.${i.value}`),
        }))}
      >
        {t('preferences.header.menuAlign')}
      </ToggleItem>
    </>
  );
}
