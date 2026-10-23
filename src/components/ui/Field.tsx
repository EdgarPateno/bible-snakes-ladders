import type { InputHTMLAttributes, ReactNode } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
}

export const inputClass =
  'w-full rounded-lg border border-walnut/40 bg-white/80 px-3 py-2 text-lg text-ink placeholder:text-ink-faint focus:border-oxblood focus:outline-none focus:ring-2 focus:ring-oxblood/30';

export function Field({ id, label, hint, error, className = '', ...rest }: FieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-base font-semibold text-ink-soft">
        {label}
      </label>
      <input id={id} className={`${inputClass} ${className}`} aria-invalid={!!error} {...rest} />
      {hint && !error && <span className="text-sm text-ink-faint">{hint}</span>}
      {error && <span className="text-sm font-semibold text-oxblood">{error}</span>}
    </div>
  );
}
