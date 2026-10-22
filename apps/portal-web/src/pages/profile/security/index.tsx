import { useTranslation } from 'react-i18next';

export default function ProfileSecurityPage() {
  const { t } = useTranslation();
  return (
    <div className="p-4">
      <div className="card bg-base-100 w-96 shadow-xl">
        <div className="card-body items-center gap-4 text-center">
          <h1 className="card-title">{t('pages.profile.securityTitle')}</h1>
          <p className="text-sm opacity-70">
            {t('pages.profile.securityPlaceholder')}
          </p>
        </div>
      </div>
    </div>
  );
}
