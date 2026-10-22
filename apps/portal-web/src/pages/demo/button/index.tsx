import { useTranslation } from 'react-i18next';
import { Permission } from '@/components/Permission';

export default function ButtonDemoPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold">{t('demo.button.title')}</h2>
        <p className="text-base-content/60 text-sm">
          {t('demo.button.description')}
        </p>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h3 className="card-title text-base">{t('demo.button.basic')}</h3>
          <div className="flex flex-wrap gap-2">
            <button className="btn">{t('demo.button.default')}</button>
            <button className="btn btn-primary">
              {t('demo.button.primary')}
            </button>
            <button className="btn btn-secondary">
              {t('demo.button.secondary')}
            </button>
            <button className="btn btn-accent">
              {t('demo.button.accent')}
            </button>
            <button className="btn btn-outline">
              {t('demo.button.outline')}
            </button>
            <button className="btn btn-ghost">{t('demo.button.ghost')}</button>
            <button className="btn btn-link">{t('demo.button.link')}</button>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h3 className="card-title text-base">
            {t('demo.button.permissionDemo')}
          </h3>
          <div className="flex flex-wrap gap-2">
            <Permission code="demo:button:view">
              <button className="btn btn-success">
                {t('demo.button.view')}
              </button>
            </Permission>
            <Permission code="demo:button:delete">
              <button className="btn btn-error">
                {t('demo.button.deleteHidden')}
              </button>
            </Permission>
            <Permission code="demo:button:delete" mode="disabled">
              <button className="btn btn-error">
                {t('demo.button.deleteDisabled')}
              </button>
            </Permission>
          </div>
          <p className="text-base-content/50 text-xs">
            {t('demo.button.permissionHint')}
          </p>
        </div>
      </div>
    </div>
  );
}
