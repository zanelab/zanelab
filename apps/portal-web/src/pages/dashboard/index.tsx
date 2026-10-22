import { useTranslation } from 'react-i18next';
import { useConfig } from '@/contexts/ConfigContext';

export default function DashboardPage() {
  const { t } = useTranslation();
  const config = useConfig();
  return (
    <div className="p-4">
      <div className="card bg-base-100 w-96 shadow-xl">
        <div className="card-body items-center gap-4 text-center">
          <h1 className="card-title">{config.system.name}</h1>
          <div className="badge badge-outline">{config.version}</div>
          <p className="text-sm opacity-70">
            {t('pages.dashboard.placeholder')}
          </p>
        </div>
      </div>
    </div>
  );
}
