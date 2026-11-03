import { useT } from '../hooks/useLang'
import type { LunchChoice } from '../lib/types'
import { ForkKnifeIcon, LunchboxIcon } from './icons'

interface LunchPickerProps {
  label: string
  value: LunchChoice | null
  busy: boolean
  // Tapping the chosen chip again clears the plan.
  onChange: (next: LunchChoice | null) => void
}

// Two chips, lunchbox or going out, neither chosen until the person says.
export function LunchPicker({ label, value, busy, onChange }: LunchPickerProps) {
  const t = useT()
  const options = [
    { key: 'box' as const, label: t.lunch.box, Icon: LunchboxIcon },
    { key: 'out' as const, label: t.lunch.out, Icon: ForkKnifeIcon },
  ]
  return (
    <div className="flex items-center justify-between gap-3" role="group" aria-label={label}>
      <span className="text-[13px] font-bold text-ink">{label}</span>
      <div className="flex gap-1.5">
        {options.map(({ key, label: text, Icon }) => {
          const on = value === key
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              disabled={busy}
              onClick={() => onChange(on ? null : key)}
              className={`flex min-h-9 items-center gap-1.5 rounded-full border-[1.5px] px-3 text-[13px] font-bold transition active:scale-[0.96] disabled:opacity-60 ${
                on ? 'border-brand bg-brand text-white shadow-brand' : 'border-line-strong bg-white text-brand'
              }`}
            >
              <Icon width={15} height={15} strokeWidth={2} />
              {text}
            </button>
          )
        })}
      </div>
    </div>
  )
}
