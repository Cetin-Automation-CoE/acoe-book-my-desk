import type { ReactNode } from 'react'

// An on/off switch, as on the phone's own settings screens.
export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-[30px] w-[50px] shrink-0 rounded-full transition ${checked ? 'bg-brand' : 'bg-line'} disabled:opacity-50`}
    >
      <span
        aria-hidden
        className={`absolute top-[3px] h-6 w-6 rounded-full bg-white shadow-[0_1px_3px_rgba(26,0,96,.25)] transition-[left] ${
          checked ? 'left-[23px]' : 'left-[3px]'
        }`}
      />
    </button>
  )
}

// A settings row: label and hint on the left, the control on the right.
export function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 py-1.5">
      <span className="flex min-w-0 flex-col">
        <span className="text-[15px] font-bold leading-5">{label}</span>
        {hint && <span className="text-xs leading-4 text-muted">{hint}</span>}
      </span>
      {children}
    </div>
  )
}
