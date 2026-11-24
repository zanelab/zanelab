import type { ReactNode } from 'react';

/**
 * Field — 表单字段布局壳（任务 11-24-skills-modal-package R2）。
 *
 * label + 控件 + 可选 hint/required/error 的排版原语；零业务语义——
 * 文案全部 props 传入（不 import i18next），控件由 children 组装。
 *
 * 可达性：纵向布局的 label 用 <label> 元素**包裹** children 控件
 * （HTML 隐式关联——控件的可访问名来自包裹 label，测试的 byRole name
 * 查询依赖它）；横向布局用 for/id 关联不可行（children 是调用方组的，
 * 组件拿不到 id），故横向时 label 只是普通标记（调用方需要可访问名时
 * 自行在控件上加 aria-label）。
 *
 * 布局：缺省纵向（label 上控件下）；horizontal 用于 checkbox 行等
 * 「label 左控件右」场景。
 */
export interface FieldProps {
  label: ReactNode;
  /** 显示 * 必填标记（纯视觉，不参与校验） */
  required?: boolean;
  /** 说明文案（控件下方，弱色） */
  hint?: ReactNode;
  /** 错误文案（红色，有值才渲染） */
  error?: ReactNode;
  /** 横向布局（label 左控件右）；缺省纵向 */
  horizontal?: boolean;
  children: ReactNode;
}

export function Field({
  label,
  required = false,
  hint,
  error,
  horizontal = false,
  children,
}: FieldProps) {
  const requiredMark = required ? <span className="text-error">*</span> : null;
  const hintNode = hint ? (
    <span className="text-base-content/50 text-xs">{hint}</span>
  ) : null;
  const errorNode = error ? (
    <span className="text-error text-xs">{error}</span>
  ) : null;

  if (horizontal) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm">
          {children}
          <span className="text-base-content">
            {requiredMark}
            {label}
          </span>
        </div>
        {hintNode}
        {errorNode}
      </div>
    );
  }
  return (
    <label className="flex flex-col gap-1">
      <span className="text-base-content text-sm">
        {requiredMark}
        {label}
      </span>
      {children}
      {hintNode}
      {errorNode}
    </label>
  );
}
