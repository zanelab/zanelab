import type { ReactNode } from 'react';

interface SelectOption {
  label: string;
  value: string;
}

interface CheckboxItemProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  items?: SelectOption[];
  children: ReactNode;
}

export function CheckboxItem({
  value,
  onChange,
  disabled = false,
  items = [],
  children,
}: CheckboxItemProps) {
  return (
    <div
      className={`my-1 flex flex-col rounded-md px-2 py-1 ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      <span className="mb-1 text-sm">{children}</span>
      <div className="mt-1 flex flex-col gap-1">
        {items.map((item) => (
          <label
            key={item.value}
            className="flex cursor-pointer items-center gap-2 text-sm"
          >
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={value.includes(item.value)}
              disabled={disabled}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange([...value, item.value]);
                } else {
                  onChange(value.filter((v) => v !== item.value));
                }
              }}
            />
            {item.label}
          </label>
        ))}
      </div>
    </div>
  );
}
