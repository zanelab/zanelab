import type { ReactNode } from 'react';
import { AppIcon } from '../../../../icons/app-icon';

interface NumberFieldItemProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  tip?: string;
  children: ReactNode;
}

export function NumberFieldItem({
  value,
  onChange,
  disabled = false,
  min = 0,
  max = 9999,
  step = 1,
  tip,
  children,
}: NumberFieldItemProps) {
  return (
    <div
      className={`my-1 flex w-full items-center justify-between rounded-md px-2 py-1 ${!tip ? 'hover:bg-base-200' : ''} ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      <span className="flex items-center text-sm">
        {children}
        {tip && (
          <span className="tooltip ml-1" data-tip={tip}>
            <AppIcon
              name="circle-help"
              className="text-base-content/50 size-3 cursor-help"
            />
          </span>
        )}
      </span>
      <div className="border-base-300 flex h-8 w-[165px] items-center overflow-hidden rounded-md border bg-transparent">
        <button
          className="text-base-content/60 hover:bg-base-200 hover:text-base-content flex h-full w-8 shrink-0 items-center justify-center transition-colors disabled:opacity-30"
          disabled={disabled || value <= min}
          onClick={() => onChange(value - step)}
        >
          <AppIcon name="minus" className="size-3.5" />
        </button>
        <div className="bg-base-300 h-5 w-px shrink-0" />
        <input
          type="number"
          className="h-full min-w-0 flex-1 [appearance:textfield] bg-transparent text-center text-sm outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
          }}
        />
        <div className="bg-base-300 h-5 w-px shrink-0" />
        <button
          className="text-base-content/60 hover:bg-base-200 hover:text-base-content flex h-full w-8 shrink-0 items-center justify-center transition-colors disabled:opacity-30"
          disabled={disabled || value >= max}
          onClick={() => onChange(value + step)}
        >
          <AppIcon name="plus" className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
