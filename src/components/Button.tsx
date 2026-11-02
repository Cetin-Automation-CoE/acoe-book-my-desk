import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'white'

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white shadow-brand hover:bg-brand-deep',
  secondary: 'border-2 border-brand bg-white text-brand hover:bg-surface',
  danger: 'bg-accent text-white shadow-danger hover:brightness-95',
  ghost: 'text-brand hover:bg-surface',
  white: 'bg-white text-brand shadow-white-btn',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-14 items-center justify-center rounded-2xl px-4 py-2 text-[17px] font-bold transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:active:scale-100 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
