import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePreferencesStore } from '../../../stores/preferences-store';
import { switchLocale } from '../../../locales/i18n';
import { AnchoredPortal } from '@zanelab/ui';
import { AppIcon } from '../../icons/app-icon';

/** 等价于 上游常量包 SUPPORT_LANGUAGES */
const SUPPORT_LANGUAGES: Array<{ label: string; value: string }> = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' },
];

/**
 * LanguageToggle — 1:1 port of widgets/language-toggle.vue.
 * 下拉单选语言菜单（上游单选下拉 → 受控下拉 + radio 选项）。
 * loadLocaleMessages 在 React port 中暂无 i18n 运行时，切换仅更新偏好。
 */
export function LanguageToggle({
  /** 根元素 class（等价参考实现 的 Vue class 透传，header 传 mr-1） */
  className = '',
}: {
  className?: string;
}) {
  const { t } = useTranslation();
  const preferences = usePreferencesStore();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  async function handleUpdate(value: string | undefined) {
    if (!value) return;

    // 切语言：写 umi_locale + 整页刷新（对齐旧项目 umi setLocale，见 locales/i18n.switchLocale）
    switchLocale(value);
    setOpen(false);
  }

  return (
    <div className={`relative ${className}`} ref={anchorRef}>
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-circle hover:animate-[shrink_0.3s_ease-in-out]"
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
