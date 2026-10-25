import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { GithubIcon, GoogleIcon, QQChatIcon, WeChatIcon } from './icons/brand';

/**
 * ThirdPartyLogin — 1:1 port of common-ui/ui/authentication/third-party-login.vue.
 * 上游图标按钮 + tooltip → daisyUI tooltip（hover 显示，等价 Radix tooltip
 * 的可见性行为；daisyUI 无 JS tooltip，CSS hover 承担）。
 * DingdingLogin：reference 依赖外部钉钉 SDK 脚本（DTFrameLogin）与 app 的
 * dingding auth 配置 —— port 无后端 auth 配置（useAppConfig 的 auth.dingding
 * 不存在），故 DingdingLogin 有意不渲染（reference v-if="dingdingAuthConfig"
 * 在无配置时同样不渲染），差异在下方注释文档化。
 */
export function ThirdPartyLogin() {
  const { t } = useTranslation();
  const [tooltip, setTooltip] = useState<string | null>(null);

  const buttons: Array<{ icon: React.ReactNode; label: string }> = [
    { icon: <WeChatIcon />, label: t('auth.thirdParty.wechat') },
    { icon: <QQChatIcon />, label: t('auth.thirdParty.qq') },
    { icon: <GithubIcon />, label: t('auth.thirdParty.github') },
    { icon: <GoogleIcon />, label: t('auth.thirdParty.google') },
    // DingdingLogin：需 dingding auth 配置（corpId/clientId）+ 外部 SDK；
    // port 无该配置 —— 等价参考实现 dingdingAuthConfig 为空时的不渲染
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
            {/* tooltip-side="top" 等价：置于按钮上方 */}
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
