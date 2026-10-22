interface RadiusProps {
  value: string;
  onChange: (value: string) => void;
}

const ITEMS = [
  { label: '0', value: '0' },
  { label: '0.25', value: '0.25' },
  { label: '0.5', value: '0.5' },
  { label: '0.75', value: '0.75' },
  { label: '1', value: '1' },
];

export function Radius({ value, onChange }: RadiusProps) {
  return (
    <div className="flex gap-2">
      {ITEMS.map((item) => (
        <button
          key={item.value}
          className={`h-7 w-16 rounded-sm border text-xs font-normal transition-colors ${
            value === item.value
              ? 'border-primary bg-primary text-primary-content'
              : 'border-base-300 hover:bg-base-200 bg-transparent'
          }`}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
