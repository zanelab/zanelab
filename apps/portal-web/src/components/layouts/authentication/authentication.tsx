import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useLayoutStore } from '../../../stores/layout-store';
import { usePreferencesStore } from '../../../stores/preferences-store';
import { systemName } from '../../../locales/i18n';
import { useAuthPanelPosition } from '../hooks/use-preferences';
import type { AuthPageLayoutProps } from './types';
import { AuthFormView } from './form';
import { SloganIcon } from './icons/slogan';
import { Toolbar } from './toolbar';
import { Copyright } from '../basic/copyright/copyright';

/**
 * AuthPageLayout — 1:1 port of authentication/authentication.vue.
 * 面板位置由 preferences.app.authPageLayout 驱动（panel-left / panel-center / panel-right）。
 */
export function AuthPageLayout({
  appName = '',
  logo = '',
  logoDark = '',
  pageTitle = '',
  pageDescription = '',
  sloganImage = '',
  toolbar = true,
  copyright = true,
  toolbarList,
  clickLogo,
  slotToolbar,
  slotLogo,
  slotCopyright,
  children,
}: AuthPageLayoutProps) {
  const preferences = usePreferencesStore();
  const isDark = useLayoutStore((s) => s.isDark);
  const { authPanelCenter, authPanelLeft, authPanelRight } =
    useAuthPanelPosition();

  // 左上角应用名：外部传入优先，否则按当前语言取系统名（config.js name / nameEn）
  const displayName = appName || systemName();

  /** 根据主题选择合适的 logo 图标 */
  const logoSrc = useMemo(() => {
    // 如果是暗色主题且提供了 logoDark，则使用暗色主题的 logo
    if (isDark && logoDark) {
      return logoDark;
    }
    // 否则使用默认的 logo
    return logo;
  }, [isDark, logoDark, logo]);

  /** copyright 插槽内容（v-bind="preferences.copyright" 等价；
   * slotCopyright prop 优先 —— #copyright slot 覆盖）。
   * 公司名未自定义（留空）时按语言取系统名，避免英文界面下仍显示中文名。 */
  const copyrightNode: ReactNode =
    slotCopyright ??
    (copyright ? (
      preferences.copyright.enable ? (
        <Copyright
          companyName={preferences.copyright.companyName || systemName()}
          companySiteLink={preferences.copyright.companySiteLink}
          date={preferences.copyright.date}
          icp={preferences.copyright.icp}
          icpLink={preferences.copyright.icpLink}
        />
      ) : null
    ) : null);

  return (
    <div
      className={`flex min-h-full flex-1 overflow-x-hidden select-none ${isDark ? 'dark' : ''}`}
    >
      {/* #toolbar slot 覆盖（reference authentication.vue:60-64） */}
      {toolbar ? (slotToolbar ?? <Toolbar toolbarList={toolbarList} />) : null}

      {/* 左侧认证面板 */}
      {authPanelLeft ? (
        <AuthFormView
          className="min-h-full w-2/5 flex-1"
          dataSide="left"
          copyright={copyrightNode}
        >
          {children}
        </AuthFormView>
      ) : null}

      {/* 头部 Logo 和应用名称（#logo slot 覆盖，reference :81-104） */}
      {slotLogo ??
        (logoSrc || displayName ? (
          <div
            className="absolute top-0 left-0 z-10 flex flex-1"
            onClick={clickLogo}
          >
            <div className="text-foreground lg:text-foreground mt-4 ml-4 flex flex-1 items-center sm:top-6 sm:left-6">
              {logoSrc ? (
                <img
                  key={logoSrc}
                  alt={displayName}
                  src={logoSrc}
                  className="mr-2"
                  width="42"
                />
              ) : null}
              {displayName ? (
                <p className="m-0 text-xl font-medium">{displayName}</p>
              ) : null}
            </div>
          </div>
        ) : null)}

      {/* 系统介绍 */}
      {!authPanelCenter ? (
        <div className="relative hidden w-0 flex-1 lg:block">
          <div className="bg-background-deep absolute inset-0 size-full dark:bg-[#070709]">
            <div className="login-background absolute top-0 left-0 size-full" />
            <div
              key={authPanelLeft ? 'left' : authPanelRight ? 'right' : 'center'}
              className={`flex-col-center mr-20 h-full ${
                authPanelLeft ? 'enter-x' : authPanelRight ? '-enter-x' : ''
              }`}
            >
              {sloganImage ? (
                <img
                  alt={displayName}
                  src={sloganImage}
                  className="animate-float h-64 w-2/5"
                />
              ) : (
                <SloganIcon className="animate-float h-64 w-2/5" />
              )}
              <div className="text-1xl text-foreground mt-6 font-sans lg:text-2xl">
                {pageTitle}
              </div>
              <div className="dark:text-muted-foreground mt-2">
                {pageDescription}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 中心认证面板 */}
      {authPanelCenter ? (
        <div className="flex-center relative w-full">
          <div className="login-background absolute top-0 left-0 size-full" />
          <AuthFormView
            className="shadow-float shadow-primary/5 md:bg-background w-full rounded-3xl pb-20 md:w-2/3 lg:w-1/2 xl:w-[36%]"
            dataSide="bottom"
            copyright={copyrightNode}
          >
            {children}
          </AuthFormView>
        </div>
      ) : null}

      {/* 右侧认证面板 */}
      {authPanelRight ? (
        <AuthFormView
          className="min-h-full w-2/5 flex-1"
          dataSide="right"
          copyright={copyrightNode}
        >
          {children}
        </AuthFormView>
      ) : null}
    </div>
  );
}
