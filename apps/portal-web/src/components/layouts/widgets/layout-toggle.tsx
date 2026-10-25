import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePreferencesStore } from '../../../stores/preferences-store';
import { AppIcon } from '../../icons/app-icon';
import type { AuthPageLayoutType } from '@zanelab/types';

interface LayoutOption {
  /** 图标注册名（BUILTIN_ICONS） */
  icon: string;

  /** 语言包 key 后缀（auth.layout.*，渲染期经 t 解析） */
  labelKey: string;
  value: AuthPageLayoutType;
}

/** 等价于 layout-toggle.vue 的 menus（$t('authentication.layout.*')） */
const LAYOUT_MENUS: LayoutOption[] = [
  { icon: 'panel-left', labelKey: 'panelLeft', value: 'panel-left' },
  { icon: 'inspection-panel', labelKey: 'panelCenter', value: 'panel-center' },
  { icon: 'panel-right', labelKey: 'panelRight', value: 'panel-right' },
];

/**
 * LayoutToggle — 1:1 port of widgets/layout-toggle.vue
 * (AuthenticationLayoutToggle)。
 * 下拉单选登录页面板位置（上游单选下拉 → 受控下拉 + radio 选项）。
 */
export function LayoutToggle() {
  const { t } = useTranslation();
  const authPageLayout = usePreferencesStore((s) => s.app.authPageLayout);
  const updatePreferences = usePreferencesStore((s) => s.updatePreferences);
  const [open, setOpen] = useState(false);

  function handleUpdate(value: AuthPageLayoutType) {
    updatePreferences({ app: { authPageLayout: value } });
    setOpen(false);
  }

  // 触发按钮图标随当前面板位置切换（PanelRight / PanelLeft / InspectionPanel）
  const triggerIcon =
    authPageLayout === 'panel-left'
      ? 'panel-left'
      : authPageLayout === 'panel-center'
        ? 'inspection-panel'
        : 'panel-right';

  return (
    <div className="relative">
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square hover:animate-[shrink_0.3s_ease-in-out]"
        title={t('widgets.layoutToggle')}
        onClick={() => setOpen((v) => !v)}
      >
        <AppIcon name={triggerIcon} className="size-4" />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="border-base-300 bg-base-100 absolute top-full right-0 z-20 mt-1 min-w-40 rounded-lg border py-1 shadow-lg">
            {LAYOUT_MENUS.map((item) => (
              <button
                key={item.value}
                type="button"
                className="hover:bg-base-200 flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-sm leading-8"
                onClick={() => handleUpdate(item.value)}
              >
                <span
                  className={`size-2 shrink-0 rounded-full border border-current ${
                    authPageLayout === item.value
                      ? 'bg-primary border-primary'
                      : 'bg-transparent'
                  }`}
                />
                <AppIcon name={item.icon} className="size-4" />
                {t(`auth.layout.${item.labelKey}`)}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
