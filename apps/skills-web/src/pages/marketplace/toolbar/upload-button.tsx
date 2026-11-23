import { AppIcon } from '@zanelab/ui';
import { useTranslation } from 'react-i18next';
import { FOCUS_RING_ON_PRIMARY_CLASS } from './focus-ring';

/**
 * 「上传 skills」入口（11-23-skills-crud-mock R5：占位入口改造为新建表单入口）。
 *
 * 显隐由调用处的 `<Permission code="skills:skill:create">` 承担；点击回调
 * onCreate 打开页面级的新建表单弹窗（SkillFormModal，状态归 marketplace.tsx
 * ——弹窗与列表重拉同层，成功后 reloadKey++ 一处驱动）。
 */
export function UploadButton({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      // 胶囊形与工具栏其余控件同款（sort-tabs.tsx：h-8 rounded-full
      // px-3.5 text-[13px] font-semibold）；primary 底色是页面唯一强调按钮。
      // 焦点环用 primary-content（近白）变体：primary 焦点环与自身底色同色 →
      // 不可见（见 focus-ring.ts）
      className={`bg-primary text-primary-content hover:bg-primary/90 inline-flex h-[42px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold whitespace-nowrap transition-colors ${FOCUS_RING_ON_PRIMARY_CLASS}`}
      onClick={onCreate}
    >
      <AppIcon name="plus" className="size-3.5" />
      {t('skills.toolbar.upload')}
    </button>
  );
}
