import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-oxblood text-parchment-50 border border-gilt shadow-[0_2px_0_#3d1010] hover:bg-oxblood-light active:translate-y-px disabled:bg-ink-faint disabled:border-ink-faint',
  secondary:
    'bg-parchment-50 text-ink border border-walnut/50 shadow-[0_2px_0_rgba(61,38,18,0.35)] hover:bg-white active:translate-y-px',
  ghost: 'bg-transparent text-ink hover:bg-walnut/10 border border-transparent',
  danger: 'bg-parchment-50 text-oxblood border border-oxblood/60 hover:bg-oxblood hover:text-parchment-50',
};
const SIZES: Record<Size, string> = {
  sm: 'text-base px-3 py-1 rounded-lg gap-1.5',
  md: 'text-lg px-4 py-2 rounded-xl gap-2',
  lg: 'text-2xl px-6 py-3 rounded-2xl gap-3',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className = '', type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    />
  );
});
