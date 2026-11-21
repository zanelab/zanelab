import { useRef } from 'react';
import { AppIcon } from '@zanelab/ui';
import { openDialog, UploadPlaceholder } from '../modal/upload-placeholder';

/**
 * 「上传 skills」入口（R8/D10）。
 *
 * 显隐由调用处的 `<Permission code="skills:skill:create">` 承担（含占位对话框
 * 一起隐藏）；点击只打开占位对话框——上传流程本身（无后端、无接口）不在本次范围。
 */
export function UploadButton() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        // 胶囊形与工具栏其余控件同款（sort-tabs.tsx：h-8 rounded-full
        // px-3.5 text-[13px] font-semibold）；primary 底色是页面唯一强调按钮
        className="bg-primary text-primary-content hover:bg-primary/90 inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors"
        onClick={() => openDialog(dialogRef.current)}
      >
        <AppIcon name="plus" className="size-3.5" />
        上传 skills
      </button>
      <UploadPlaceholder dialogRef={dialogRef} />
    </>
  );
}
