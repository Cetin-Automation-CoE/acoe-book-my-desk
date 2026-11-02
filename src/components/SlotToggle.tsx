import { useT } from '../hooks/useLang'
import type { SlotChoice } from '../lib/types'
import { HalfGlyph } from './HalfGlyph'

const choices: SlotChoice[] = ['AM', 'PM', 'FULL']

// Glass segmented control on the band.
export function SlotToggle({ value, onChange }: { value: SlotChoice; onChange: (v: SlotChoice) => void }) {
  const t = useT()
  return (
    <div className="mt-3.5 flex gap-0.5 rounded-2xl border border-white/14 bg-white/10 p-1" role="radiogroup" aria-label="Half day">
      {choices.map((choice) => {
        const active = choice === value
        return (
          <button
            key={choice}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(choice)}
            className={`flex flex-1 items-center justify-center gap-[7px] rounded-xl py-[9px] text-sm font-bold leading-5 transition ${
              active ? 'bg-white text-brand shadow-toggle' : 'text-white/86'
            }`}
          >
            <HalfGlyph slot={choice} size={12} />
            <span>{t.slots[choice]}</span>
          </button>
        )
      })}
    </div>
  )
}
