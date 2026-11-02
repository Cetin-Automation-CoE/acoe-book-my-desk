import { useT } from '../hooks/useLang'
import { dayLabel, gapsBefore } from '../lib/dates'

interface DayStripProps {
  days: string[]
  selected: string
  today: string
  onSelect: (date: string) => void
  // Days where I have a booking (sky dot).
  mine?: ReadonlySet<string>
  // Team days (white dot).
  marks?: ReadonlySet<string>
}

// One pill per bookable working day, on the band. A gap opens after a weekend.
export function DayStrip({ days, selected, today, onSelect, mine, marks }: DayStripProps) {
  const t = useT()
  const gaps = gapsBefore(days)
  return (
    <div className="mt-5 flex gap-1.5" role="tablist" aria-label="Day">
      {days.map((date) => {
        const label = dayLabel(date, today)
        const isSelected = date === selected
        const isToday = date === today
        const isMine = mine?.has(date) ?? false
        const isMarked = marks?.has(date) ?? false
        const aria = [label.relative ?? `${label.weekday} ${label.day} ${label.month}`, isMarked ? t.teamDay.show : '']
        return (
          <button
            key={date}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-label={aria.filter(Boolean).join(', ')}
            onClick={() => onSelect(date)}
            className={`flex min-w-0 flex-1 flex-col items-center rounded-2xl pb-[7px] pt-2 transition active:scale-95 ${
              gaps.has(date) ? 'ml-2' : ''
            } ${isSelected ? 'bg-white text-brand shadow-pill' : 'bg-transparent text-white'}`}
          >
            <span
              className={`text-[11px] font-bold uppercase leading-[15px] tracking-[0.06em] ${isSelected ? 'text-brand/55' : 'text-white/60'}`}
            >
              {label.weekday}
            </span>
            <span className="text-[21px] font-extrabold leading-[26px] tabular-nums">{label.day}</span>
            <span className="mt-[3px] flex h-[5px] gap-[3px]">
              {isToday && <span className="h-[5px] w-[5px] rounded-full bg-accent" />}
              {isMine && <span className={`h-[5px] w-[5px] rounded-full ${isSelected ? 'bg-brand' : 'bg-sky'}`} />}
              {isMarked && <span className={`h-[5px] w-[5px] rounded-full ${isSelected ? 'bg-brand/40' : 'bg-white/80'}`} />}
            </span>
          </button>
        )
      })}
    </div>
  )
}
