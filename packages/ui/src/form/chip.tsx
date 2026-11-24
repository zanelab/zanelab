import type { ReactNode } from 'react';
import { AppIcon } from '../icon/app-icon';

/**
 * ChipGroup — 胶囊选择组（任务 11-24-skills-modal-package R2）。
 *
 * 参考站 radio/checkbox 胶囊形态：`peer sr-only` 原生 input 保可达性 +
 * 胶囊视觉（选中 primary 底 primary 字，跟主题）。check/select 两 variant
 * 结构同构（数组语义由调用方维护——组件不决定单/多），单选方传 selected
 * 长度 0/1 的数组即可。
 *
 * 图标可选（icon 为 BUILTIN_ICONS/运行时注册表标识符，经 AppIcon 渲染）。
 */
export interface ChipOption {
  value: string;
  label: ReactNode;
  /** 可选图标标识符（AppIcon 解析；未命中不渲染、布局不塌） */
  icon?: string;
}

export interface ChipGroupProps {
  /** 组标题（可选） */
  label?: ReactNode;
  options: ChipOption[];
  /** 选中值集合（ChipSelect 用法传长度 0/1 数组） */
  selected: string[];
  /** 切换回调（传入值是否在选中集由调用方维护） */
  onToggle: (value: string) => void;
  /** check（复选语义，缺省）| select（单选语义） */
  variant?: 'check' | 'select';
  /** 禁用整组 */
  disabled?: boolean;
}

export function ChipGroup({
  label,
  options,
  selected,
  onToggle,
  variant = 'check',
  disabled = false,
}: ChipGroupProps) {
  const inputType = variant === 'select' ? 'radio' : 'checkbox';
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <span className="text-base-content text-sm">{label}</span>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <label
              key={option.value}
              className={
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              }
            >
              <input
                type={inputType}
                name={variant === 'select' ? undefined : undefined}
                className="peer sr-only"
                checked={checked}
                disabled={disabled}
                onChange={() => onToggle(option.value)}
              />
              <span
                className={`border-base-300 bg-base-100 text-base-content peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-content peer-focus-visible:ring-primary/50 flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors peer-focus-visible:ring-2 ${
                  disabled ? '' : 'hover:border-base-content/30'
                }`}
              >
                {option.icon ? (
                  <AppIcon name={option.icon} className="size-4" />
                ) : null}
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
