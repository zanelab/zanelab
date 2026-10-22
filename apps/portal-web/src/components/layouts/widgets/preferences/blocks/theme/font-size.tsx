import { useTranslation } from 'react-i18next';
import { NumberFieldItem } from '../number-field-item';

interface FontSizeProps {
  value: number;
  onChange: (value: number) => void;
}

export function FontSize({ value, onChange }: FontSizeProps) {
  const { t } = useTranslation();
  return (
    <NumberFieldItem
      value={value}
      onChange={onChange}
      min={15}
      max={22}
      step={1}
    >
      {t('preferences.theme.fontSizeLabel')}
    </NumberFieldItem>
  );
}
