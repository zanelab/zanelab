import type { ReactNode } from 'react';

/**
 * ModalActions — 弹窗底部操作条（任务 11-24-skills-modal-package R2）。
 *
 * 布局原语：左状态文案（status：错误/提示）+ 右按钮组（children，由调用方
 * 组 Cancel/Submit 按钮——按钮样式/状态差异大，不抽按钮本体，保持原语薄）。
 */
export interface ModalActionsProps {
  /** 左侧状态/错误文案（有值才渲染） */
  status?: ReactNode;
  children: ReactNode;
}

export function ModalActions({ status, children }: ModalActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        {status ? (
          <p role="alert" className="text-error text-[12.5px] font-medium">
            {status}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
