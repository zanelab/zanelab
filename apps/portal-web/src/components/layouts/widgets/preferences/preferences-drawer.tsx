import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  BreadcrumbStyleType,
  BuiltinThemeType,
  LayoutMode,
} from '@zanelab/types';
import type { TabbarStyleType } from '../../../../stores/preferences-store';
import {
  usePreferencesStore,
  defaultPreferences,
} from '../../../../stores/preferences-store';
import { useLayoutStore } from '../../../../stores/layout-store';
import { AppIcon } from '../../../icons/app-icon';
import { diff } from '@zanelab/utils';
import { switchLocale } from '../../../../locales/i18n';
import { switchThemeMode } from '../../../../utils/theme-transition';
import {
  Block,
  Animation,
  General,
  Theme,
  BuiltinTheme,
  Radius,
  FontSize,
  ColorMode,
  Layout,
  Content,
  Sidebar,
  Header,
  Navigation,
  Breadcrumb,
  Tabbar,
  Widget,
  Footer,
  Copyright,
  GlobalShortcutKeys,
} from './blocks';

interface PreferencesDrawerProps {
  onClose: () => void;

  onClearPreferencesAndLogout?: () => void;
}

const CloseIcon = () => <AppIcon name="close" className="size-4.5" />;

const RotateCwIcon = () => <AppIcon name="rotate-cw" className="size-4" />;

const CopyIcon = () => <AppIcon name="copy" className="size-3" />;

const PinIcon = () => <AppIcon name="pin-filled" className="size-4" />;

const PinOffIcon = () => <AppIcon name="pin-off-filled" className="size-4" />;

type TabValue = 'appearance' | 'layout' | 'shortcutKey' | 'general';

const TABS = [
  { value: 'appearance' as const },
  { value: 'layout' as const },
  { value: 'shortcutKey' as const },
  { value: 'general' as const },
];

export function PreferencesDrawer({
  onClose,
  onClearPreferencesAndLogout,
}: PreferencesDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('appearance');
  const { t } = useTranslation();
  const prefs = usePreferencesStore();
  const isDark = useLayoutStore((s) => s.isDark);

  const isFullContent = prefs.app.layout === 'full-content';
  const isHeaderNav = prefs.app.layout === 'header-nav';
  const isMixedNav = prefs.app.layout === 'mixed-nav';
  const isSideNav = prefs.app.layout === 'sidebar-nav';
  const isSideMixedNav = prefs.app.layout === 'sidebar-mixed-nav';
  const isHeaderSidebarNav = prefs.app.layout === 'header-sidebar-nav';
  const isSideMode = !isFullContent && !isHeaderNav;

  const showBreadcrumbConfig = useMemo(() => {
    return !isFullContent && !isMixedNav && !isHeaderNav && prefs.header.enable;
  }, [isFullContent, isMixedNav, isHeaderNav, prefs.header.enable]);

  const update = prefs.updatePreferences;

  const handleBuiltinTypeChange = useCallback(
    (v: string) => update({ theme: { builtinType: v as BuiltinThemeType } }),
    [update],
  );
  const handleThemeColorPrimaryChange = useCallback(
    (v: string) => update({ theme: { colorPrimary: v } }),
    [update],
  );

  const diffPreference = useMemo(() => {
    const {
      updatePreferences: _u,
      setLayout: _sl,
      setSidebarCollapsed: _sc,
      toggleSidebar: _t,
      resetPreferences: _r,
      ...current
    } = prefs;
    return diff(
      defaultPreferences as Record<string, unknown>,
      current as Record<string, unknown>,
    );
  }, [prefs]);

  const mergedDiffPreference = diffPreference ?? undefined;

  const handleReset = () => {
    if (!mergedDiffPreference) return;
    prefs.resetPreferences();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(
      JSON.stringify(mergedDiffPreference, null, 2),
    );
  };

  return (
    <div className="fixed inset-0 z-9999 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="bg-base-100 relative flex h-full w-full flex-col overflow-y-auto shadow-2xl sm:max-w-sm">
        <div className="border-base-300 flex shrink-0 items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="text-base leading-none font-semibold">
              {t('preferences.title')}
            </h3>
            <p className="text-base-content/60 mt-1 text-xs">
              {t('preferences.subTitle')}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="btn btn-ghost btn-sm btn-square relative h-8 w-8"
              onClick={handleReset}
              disabled={!mergedDiffPreference}
              title={t('preferences.reset')}
            >
              {mergedDiffPreference && (
                <span className="bg-primary absolute top-0.5 right-0.5 size-2 rounded-sm" />
              )}
              <RotateCwIcon />
            </button>
            <button
              className="btn btn-ghost btn-sm btn-square h-8 w-8"
              onClick={() =>
                update({
                  app: {
                    enableStickyPreferencesNavigationBar:
                      !prefs.app.enableStickyPreferencesNavigationBar,
                  },
                })
              }
              title={
                prefs.app.enableStickyPreferencesNavigationBar
                  ? t('preferences.unpinNav')
                  : t('preferences.pinNav')
              }
            >
              {prefs.app.enableStickyPreferencesNavigationBar ? (
                <PinOffIcon />
              ) : (
                <PinIcon />
              )}
            </button>
            <button
              className="btn btn-ghost btn-sm btn-square h-8 w-8"
              onClick={onClose}
              title={t('common.close')}
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <div
          className={`shrink-0 px-5 pt-3 ${prefs.app.enableStickyPreferencesNavigationBar ? 'bg-base-100 sticky top-0 z-[10000]' : ''}`}
        >
          <div className="join bg-base-200 w-full rounded-md p-1">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                className={`join-item btn btn-xs h-7 min-h-0 flex-1 rounded-sm text-xs font-medium ${
                  activeTab === tab.value ? 'btn-primary' : 'btn-ghost'
                }`}
                onClick={() => setActiveTab(tab.value)}
              >
                {t(`preferences.tabs.${tab.value}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-x-hidden overflow-y-auto px-3">
          {activeTab === 'appearance' && (
            <>
              <Block title={t('preferences.blocks.theme')}>
                <Theme
                  value={prefs.theme.mode}
                  onChange={(v) =>
                    switchThemeMode(v as 'light' | 'dark' | 'auto')
                  }
                  currentLayout={prefs.app.layout}
                  themeSemiDarkSidebar={prefs.theme.semiDarkSidebar}
                  onThemeSemiDarkSidebarChange={(v) =>
                    update({ theme: { semiDarkSidebar: v } })
                  }
                  themeSemiDarkSidebarSub={prefs.theme.semiDarkSidebarSub}
                  onThemeSemiDarkSidebarSubChange={(v) =>
                    update({ theme: { semiDarkSidebarSub: v } })
                  }
                  themeSemiDarkHeader={prefs.theme.semiDarkHeader}
                  onThemeSemiDarkHeaderChange={(v) =>
                    update({ theme: { semiDarkHeader: v } })
                  }
                />
              </Block>
              <Block title={t('preferences.blocks.builtinTheme')}>
                <BuiltinTheme
                  value={prefs.theme.builtinType}
                  onChange={handleBuiltinTypeChange}
                  themeColorPrimary={prefs.theme.colorPrimary}
                  onThemeColorPrimaryChange={handleThemeColorPrimaryChange}
                  isDark={isDark}
                />
              </Block>
              <Block title={t('preferences.blocks.radius')}>
                <Radius
                  value={prefs.theme.radius}
                  onChange={(v) => update({ theme: { radius: v } })}
                />
              </Block>
              <Block title={t('preferences.blocks.fontSize')}>
                <FontSize
                  value={prefs.theme.fontSize}
                  onChange={(v) => update({ theme: { fontSize: v } })}
                />
              </Block>
              <Block title={t('preferences.blocks.other')}>
                <ColorMode
                  appColorWeakMode={prefs.app.colorWeakMode}
                  onAppColorWeakModeChange={(v) =>
                    update({ app: { colorWeakMode: v } })
                  }
                  appColorGrayMode={prefs.app.colorGrayMode}
                  onAppColorGrayModeChange={(v) =>
                    update({ app: { colorGrayMode: v } })
                  }
                />
              </Block>
            </>
          )}

          {activeTab === 'layout' && (
            <>
              <Block title={t('preferences.blocks.layout')}>
                <Layout
                  value={prefs.app.layout}
                  onChange={(v) => update({ app: { layout: v as LayoutMode } })}
                />
              </Block>
              <Block title={t('preferences.blocks.contentArea')}>
                <Content
                  value={prefs.app.contentCompact}
                  onChange={(v) =>
                    update({ app: { contentCompact: v as 'wide' | 'compact' } })
                  }
                />
              </Block>
              <Block title={t('preferences.blocks.sidebar')}>
                <Sidebar
                  currentLayout={prefs.app.layout}
                  disabled={!isSideMode}
                  sidebarEnable={prefs.sidebar.enable}
                  onSidebarEnableChange={(v) =>
                    update({ sidebar: { enable: v } })
                  }
                  sidebarDraggable={prefs.sidebar.draggable}
                  onSidebarDraggableChange={(v) =>
                    update({ sidebar: { draggable: v } })
                  }
                  sidebarCollapsed={prefs.sidebar.collapsed}
                  onSidebarCollapsedChange={(v) =>
                    update({ sidebar: { collapsed: v } })
                  }
                  sidebarExpandOnHover={prefs.sidebar.expandOnHover}
                  onSidebarExpandOnHoverChange={(v) =>
                    update({ sidebar: { expandOnHover: v } })
                  }
                  sidebarCollapsedShowTitle={prefs.sidebar.collapsedShowTitle}
                  onSidebarCollapsedShowTitleChange={(v) =>
                    update({ sidebar: { collapsedShowTitle: v } })
                  }
                  sidebarAutoActivateChild={prefs.sidebar.autoActivateChild}
                  onSidebarAutoActivateChildChange={(v) =>
                    update({ sidebar: { autoActivateChild: v } })
                  }
                  sidebarButtons={prefs.sidebar.buttons}
                  onSidebarButtonsChange={(v) =>
                    update({ sidebar: { buttons: v } })
                  }
                  sidebarWidth={prefs.sidebar.width}
                  onSidebarWidthChange={(v) =>
                    update({ sidebar: { width: v } })
                  }
                />
              </Block>
              <Block title={t('preferences.blocks.header')}>
                <Header
                  disabled={isFullContent}
                  headerEnable={prefs.header.enable}
                  onHeaderEnableChange={(v) =>
                    update({ header: { enable: v } })
                  }
                  headerMode={prefs.header.mode}
                  onHeaderModeChange={(v) =>
                    update({
                      header: {
                        mode: v as 'fixed' | 'auto' | 'auto-scroll' | 'static',
                      },
                    })
                  }
                  headerMenuAlign={prefs.header.menuAlign}
                  onHeaderMenuAlignChange={(v) =>
                    update({
                      header: { menuAlign: v as 'start' | 'center' | 'end' },
                    })
                  }
                />
              </Block>
              <Block title={t('preferences.blocks.navigationMenu')}>
                <Navigation
                  disabled={isFullContent}
                  disabledNavigationSplit={!isMixedNav}
                  navigationStyleType={prefs.navigation.styleType}
                  onNavigationStyleTypeChange={(v) =>
                    update({
                      navigation: { styleType: v as 'rounded' | 'plain' },
                    })
                  }
                  navigationSplit={prefs.navigation.split}
                  onNavigationSplitChange={(v) =>
                    update({ navigation: { split: v } })
                  }
                  navigationAccordion={prefs.navigation.accordion}
                  onNavigationAccordionChange={(v) =>
                    update({ navigation: { accordion: v } })
                  }
                />
              </Block>
              <Block title={t('preferences.blocks.breadcrumb')}>
                <Breadcrumb
                  disabled={
                    !showBreadcrumbConfig ||
                    !(isSideNav || isSideMixedNav || isHeaderSidebarNav)
                  }
                  breadcrumbEnable={prefs.breadcrumb.enable}
                  onBreadcrumbEnableChange={(v) =>
                    update({ breadcrumb: { enable: v } })
                  }
                  breadcrumbHideOnlyOne={prefs.breadcrumb.hideOnlyOne}
                  onBreadcrumbHideOnlyOneChange={(v) =>
                    update({ breadcrumb: { hideOnlyOne: v } })
                  }
                  breadcrumbShowIcon={prefs.breadcrumb.showIcon}
                  onBreadcrumbShowIconChange={(v) =>
                    update({ breadcrumb: { showIcon: v } })
                  }
                  breadcrumbShowHome={prefs.breadcrumb.showHome}
                  onBreadcrumbShowHomeChange={(v) =>
                    update({ breadcrumb: { showHome: v } })
                  }
                  breadcrumbStyleType={prefs.breadcrumb.styleType}
                  onBreadcrumbStyleTypeChange={(v) =>
                    update({
                      breadcrumb: { styleType: v as BreadcrumbStyleType },
                    })
                  }
                />
              </Block>
              <Block title={t('preferences.blocks.tabbar')}>
                <Tabbar
                  tabbarEnable={prefs.tabbar.enable}
                  onTabbarEnableChange={(v) =>
                    update({ tabbar: { enable: v } })
                  }
                  tabbarPersist={prefs.tabbar.persist}
                  onTabbarPersistChange={(v) =>
                    update({ tabbar: { persist: v } })
                  }
                  tabbarVisitHistory={prefs.tabbar.visitHistory}
                  onTabbarVisitHistoryChange={(v) =>
                    update({ tabbar: { visitHistory: v } })
                  }
                  tabbarDraggable={prefs.tabbar.draggable}
                  onTabbarDraggableChange={(v) =>
                    update({ tabbar: { draggable: v } })
                  }
                  tabbarWheelable={prefs.tabbar.wheelable}
                  onTabbarWheelableChange={(v) =>
                    update({ tabbar: { wheelable: v } })
                  }
                  tabbarShowIcon={prefs.tabbar.showIcon}
                  onTabbarShowIconChange={(v) =>
                    update({ tabbar: { showIcon: v } })
                  }
                  tabbarShowMore={prefs.tabbar.showMore}
                  onTabbarShowMoreChange={(v) =>
                    update({ tabbar: { showMore: v } })
                  }
                  tabbarShowMaximize={prefs.tabbar.showMaximize}
                  onTabbarShowMaximizeChange={(v) =>
                    update({ tabbar: { showMaximize: v } })
                  }
                  tabbarStyleType={prefs.tabbar.styleType}
                  onTabbarStyleTypeChange={(v) =>
                    update({ tabbar: { styleType: v as TabbarStyleType } })
                  }
                  tabbarMaxCount={prefs.tabbar.maxCount}
                  onTabbarMaxCountChange={(v) =>
                    update({ tabbar: { maxCount: v } })
                  }
                  tabbarMiddleClickToClose={prefs.tabbar.middleClickToClose}
                  onTabbarMiddleClickToCloseChange={(v) =>
                    update({ tabbar: { middleClickToClose: v } })
                  }
                />
              </Block>
              <Block title={t('preferences.blocks.widgets')}>
                <Widget
                  widgetGlobalSearch={prefs.widget.globalSearch}
                  onWidgetGlobalSearchChange={(v) =>
                    update({ widget: { globalSearch: v } })
                  }
                  widgetFullscreen={prefs.widget.fullscreen}
                  onWidgetFullscreenChange={(v) =>
                    update({ widget: { fullscreen: v } })
                  }
                  widgetLanguageToggle={prefs.widget.languageToggle}
                  onWidgetLanguageToggleChange={(v) =>
                    update({ widget: { languageToggle: v } })
                  }
                  widgetNotification={prefs.widget.notification}
                  onWidgetNotificationChange={(v) =>
                    update({ widget: { notification: v } })
                  }
                  widgetThemeToggle={prefs.widget.themeToggle}
                  onWidgetThemeToggleChange={(v) =>
                    update({ widget: { themeToggle: v } })
                  }
                  widgetSidebarToggle={prefs.widget.sidebarToggle}
                  onWidgetSidebarToggleChange={(v) =>
                    update({ widget: { sidebarToggle: v } })
                  }
                  widgetLockScreen={prefs.widget.lockScreen}
                  onWidgetLockScreenChange={(v) =>
                    update({ widget: { lockScreen: v } })
                  }
                  widgetRefresh={prefs.widget.refresh}
                  onWidgetRefreshChange={(v) =>
                    update({ widget: { refresh: v } })
                  }
                  widgetTimezone={prefs.widget.timezone}
                  onWidgetTimezoneChange={(v) =>
                    update({ widget: { timezone: v } })
                  }
                  appPreferencesButtonPosition={
                    prefs.app.preferencesButtonPosition
                  }
                  onAppPreferencesButtonPositionChange={(v) =>
                    update({ app: { preferencesButtonPosition: v } })
                  }
                />
              </Block>
              <Block title={t('preferences.blocks.footer')}>
                <Footer
                  footerEnable={prefs.footer.enable}
                  onFooterEnableChange={(v) =>
                    update({ footer: { enable: v } })
                  }
                  footerFixed={prefs.footer.fixed}
                  onFooterFixedChange={(v) => update({ footer: { fixed: v } })}
                />
              </Block>
              {prefs.copyright.settingShow && (
                <Block title={t('preferences.blocks.copyright')}>
                  <Copyright
                    disabled={!prefs.footer.enable}
                    copyrightEnable={prefs.copyright.enable}
                    onCopyrightEnableChange={(v) =>
                      update({ copyright: { enable: v } })
                    }
                    copyrightCompanyName={prefs.copyright.companyName}
                    onCopyrightCompanyNameChange={(v) =>
                      update({ copyright: { companyName: v } })
                    }
                    copyrightCompanySiteLink={prefs.copyright.companySiteLink}
                    onCopyrightCompanySiteLinkChange={(v) =>
                      update({ copyright: { companySiteLink: v } })
                    }
                    copyrightDate={prefs.copyright.date}
                    onCopyrightDateChange={(v) =>
                      update({ copyright: { date: v } })
                    }
                    copyrightIcp={prefs.copyright.icp}
                    onCopyrightIcpChange={(v) =>
                      update({ copyright: { icp: v } })
                    }
                    copyrightIcpLink={prefs.copyright.icpLink}
                    onCopyrightIcpLinkChange={(v) =>
                      update({ copyright: { icpLink: v } })
                    }
                  />
                </Block>
              )}
            </>
          )}

          {activeTab === 'shortcutKey' && (
            <Block title={t('preferences.blocks.globalShortcuts')}>
              <GlobalShortcutKeys
                shortcutKeysEnable={prefs.shortcutKeys.enable}
                onShortcutKeysEnableChange={(v) =>
                  update({ shortcutKeys: { enable: v } })
                }
                shortcutKeysGlobalSearch={prefs.shortcutKeys.globalSearch}
                onShortcutKeysGlobalSearchChange={(v) =>
                  update({ shortcutKeys: { globalSearch: v } })
                }
                shortcutKeysGlobalLockScreen={
                  prefs.shortcutKeys.globalLockScreen
                }
                onShortcutKeysGlobalLockScreenChange={(v) =>
                  update({ shortcutKeys: { globalLockScreen: v } })
                }
                shortcutKeysGlobalLogout={prefs.shortcutKeys.globalLogout}
                onShortcutKeysGlobalLogoutChange={(v) =>
                  update({ shortcutKeys: { globalLogout: v } })
                }
              />
            </Block>
          )}

          {activeTab === 'general' && (
            <>
              <Block title={t('preferences.blocks.general')}>
                <General
                  appLocale={prefs.app.locale}
                  onAppLocaleChange={(v) => switchLocale(v)}
                  appTimezone={prefs.app.timezone}
                  onAppTimezoneChange={(v) => update({ app: { timezone: v } })}
                  appDynamicTitle={prefs.app.dynamicTitle}
                  onAppDynamicTitleChange={(v) =>
                    update({ app: { dynamicTitle: v } })
                  }
                  appWatermark={prefs.app.watermark}
                  onAppWatermarkChange={(v) =>
                    update({ app: { watermark: v } })
                  }
                  appWatermarkContent={prefs.app.watermarkContent}
                  onAppWatermarkContentChange={(v) =>
                    update({ app: { watermarkContent: v } })
                  }
                  appEnableCheckUpdates={prefs.app.enableCheckUpdates}
                  onAppEnableCheckUpdatesChange={(v) =>
                    update({ app: { enableCheckUpdates: v } })
                  }
                  appEnableCopyPreferences={prefs.app.enableCopyPreferences}
                  onAppEnableCopyPreferencesChange={(v) =>
                    update({ app: { enableCopyPreferences: v } })
                  }
                />
              </Block>
              <Block title={t('preferences.blocks.animation')}>
                <Animation
                  transitionProgress={prefs.transition.progress}
                  onTransitionProgressChange={(v) =>
                    update({ transition: { progress: v } })
                  }
                  transitionName={prefs.transition.name}
                  onTransitionNameChange={(v) =>
                    update({ transition: { name: v } })
                  }
                  transitionEnable={prefs.transition.enable}
                  onTransitionEnableChange={(v) =>
                    update({ transition: { enable: v } })
                  }
                  transitionLoading={prefs.transition.loading}
                  onTransitionLoadingChange={(v) =>
                    update({ transition: { loading: v } })
                  }
                />
              </Block>
            </>
          )}
        </div>

        <div className="border-base-300 shrink-0 space-y-2 border-t px-5 py-4">
          {prefs.app.enableCopyPreferences && (
            <button
              className="btn btn-default btn-sm w-full"
              disabled={!mergedDiffPreference}
              onClick={handleCopy}
            >
              <CopyIcon />
              <span className="ml-1">{t('preferences.copyPreferences')}</span>
            </button>
          )}
          <button
            className="btn btn-ghost btn-sm w-full"
            disabled={!mergedDiffPreference}
            onClick={() => {
              prefs.resetPreferences();
              onClearPreferencesAndLogout?.();
            }}
          >
            {t('preferences.clearCacheAndLogout')}
          </button>
        </div>
      </div>
    </div>
  );
}
