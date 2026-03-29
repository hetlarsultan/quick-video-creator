interface SegmentedControlProps<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="flex rounded-2xl bg-card p-1 border border-border">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${active ? 'gradient-primary text-primary-foreground' : 'text-foreground hover:bg-accent'}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
