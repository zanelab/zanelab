import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { GithubIcon, GoogleIcon, QQChatIcon, WeChatIcon } from './icons/brand';

export function ThirdPartyLogin() {
  const { t } = useTranslation();
  const [tooltip, setTooltip] = useState<string | null>(null);

  const buttons: Array<{ icon: React.ReactNode; label: string }> = [
    { icon: <WeChatIcon />, label: t('auth.thirdParty.wechat') },
    { icon: <QQChatIcon />, label: t('auth.thirdParty.qq') },
    { icon: <GithubIcon />, label: t('auth.thirdParty.github') },
    { icon: <GoogleIcon />, label: t('auth.thirdParty.google') },
  ];

  return (
    <div className="w-full sm:mx-auto md:max-w-md">
      <div className="mt-4 flex items-center justify-between">
        <span className="border-input w-[35%] border-b dark:border-gray-600" />
        <span className="text-muted-foreground text-center text-xs uppercase">
          {t('auth.thirdParty.title')}
        </span>
        <span className="border-input w-[35%] border-b dark:border-gray-600" />
      </div>

      <div className="relative mt-4 flex flex-wrap justify-center">
        {buttons.map(({ icon, label }) => (
          <div key={label} className="relative mb-3">
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square mx-1"
              aria-label={label}
              onMouseEnter={() => setTooltip(label)}
              onMouseLeave={() => setTooltip(null)}
            >
              {icon}
            </button>
            {tooltip === label ? (
              <div
                role="tooltip"
                className="tooltip tooltip-top bg-neutral text-neutral-content visible absolute -top-9 left-1/2 -translate-x-1/2 rounded-md px-2 py-1 text-xs whitespace-nowrap"
              >
                {label}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
