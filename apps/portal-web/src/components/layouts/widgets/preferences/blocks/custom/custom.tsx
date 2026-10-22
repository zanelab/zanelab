import { useTranslation } from 'react-i18next';

interface CustomProps {
  fields?: unknown[];
  values?: Record<string, unknown>;
  onUpdate?: (values: Record<string, unknown>) => void;
}

export function Custom({
  fields,
  values: _values,
  onUpdate: _onUpdate,
}: CustomProps) {
  const { t } = useTranslation();
  if (!fields || fields.length === 0) {
    return (
      <div className="text-base-content/60 py-2 text-sm">
        {t('preferences.custom.empty')}
      </div>
    );
  }
  return (
    <div className="text-base-content/60 py-2 text-sm">
      {t('preferences.custom.title', { count: fields.length })}
    </div>
  );
}
