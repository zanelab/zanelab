import type { ReactNode } from 'react';

interface SelectOption {
  label: string;
  value: string;
}

interface ToggleItemProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  items?: SelectOption[];
  children: ReactNode;
}

export function ToggleItem({
  value,
  onChange,
  disabled = false,
  items = [],
  children,
}: ToggleItemProps) {
  return (
    <div
      className={`hover:bg-base-200 flex w-full items-center justify-between rounded-md p-2 ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      <span className="text-sm">{children}</span>
      <div className="flex gap-2">
        {items.map((item) => (
          <button
            key={item.value}
            className={`h-7 min-h-0 rounded-sm px-3 text-xs font-normal ${
              value === item.value
                ? 'bg-primary text-primary-content'
                : 'btn btn-outline btn-sm'
            }`}
            disabled={disabled}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
