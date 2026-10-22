import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePreferencesStore } from '../../../stores/preferences-store';
import { switchLocale } from '../../../locales/i18n';
import { AnchoredPortal } from '@zanelab/ui';
import { AppIcon } from '../../icons/app-icon';

const SUPPORT_LANGUAGES: Array<{ label: string; value: string }> = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' },
];

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const preferences = usePreferencesStore();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  async function handleUpdate(value: string | undefined) {
    if (!value) return;

    switchLocale(value);
    setOpen(false);
  }

  return (
    <div className={`relative ${className}`} ref={anchorRef}>
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square hover:animate-[shrink_0.3s_ease-in-out]"
        title={t('widgets.languageToggle')}
        onClick={() => setOpen((v) => !v)}
      >
        <AppIcon name="languages" className="size-4" />
      </button>

      <AnchoredPortal
        open={open}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
        offsetY={4}
      >
        <div className="border-base-300 bg-base-100 min-w-40 rounded-lg border py-1 shadow-lg">
          {SUPPORT_LANGUAGES.map((item) => (
            <button
              key={item.value}
              type="button"
              className="hover:bg-base-200 flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-sm leading-8"
              onClick={() => handleUpdate(item.value)}
            >
              <span
                className={`size-2 shrink-0 rounded-full border border-current ${
                  preferences.app.locale === item.value
                    ? 'bg-primary border-primary'
                    : 'bg-transparent'
                }`}
              />
              {item.label}
            </button>
          ))}
        </div>
      </AnchoredPortal>
    </div>
  );
}
