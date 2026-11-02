import type { SlotChoice } from '../lib/types'
import { strings } from '../strings'

const choices: SlotChoice[] = ['AM', 'PM', 'FULL']

export function SlotToggle({ value, onChange }: { value: SlotChoice; onChange: (v: SlotChoice) => void }) {
  return (
    <div className="flex rounded-xl border border-line bg-white p-1" role="radiogroup" aria-label="Half day">
      {choices.map((choice) => {
        const active = choice === value
        return (
          <button
            key={choice}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(choice)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              active ? 'bg-brand text-white' : 'text-neutral-700 hover:bg-surface'
            }`}
          >
            {strings.slots[choice]}
          </button>
        )
      })}
    </div>
  )
}
