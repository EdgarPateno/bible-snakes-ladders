interface ToggleProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function Toggle({ id, label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-lg font-semibold">{label}</span>
        {description && <span className="block text-base text-ink-soft">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-1 h-7 w-12 shrink-0 rounded-full border transition-colors ${
          checked ? 'border-olive-dark bg-olive' : 'border-walnut/40 bg-parchment-200'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${checked ? 'left-6' : 'left-0.5'}`}
        />
      </button>
    </div>
  );
}
