import { useTranslation } from 'react-i18next';
import { ContentCompact, ContentWide } from '../../icons';

interface ContentProps {
  value: string;
  onChange: (value: string) => void;
}

export function Content({ value, onChange }: ContentProps) {
  const { t } = useTranslation();
  return (
    <div className="flex w-full flex-wrap gap-5">
      <div
        className="flex w-25 cursor-pointer flex-col"
        onClick={() => onChange('wide')}
      >
        <div
          className={`outline-box flex-center ${
            value === 'wide' ? 'outline-box-active' : ''
          }`}
        >
          <ContentWide />
        </div>
        <div className="text-base-content/60 mt-2 text-center text-xs">
          {t('preferences.content.wide')}
        </div>
      </div>
      <div
        className="flex w-25 cursor-pointer flex-col"
        onClick={() => onChange('compact')}
      >
        <div
          className={`outline-box flex-center ${
            value === 'compact' ? 'outline-box-active' : ''
          }`}
        >
          <ContentCompact />
        </div>
        <div className="text-base-content/60 mt-2 text-center text-xs">
          {t('preferences.content.compact')}
        </div>
      </div>
    </div>
  );
}
