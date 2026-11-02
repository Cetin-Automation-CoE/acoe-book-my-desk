import { useEffect, useRef } from 'react'
import { dayLabel } from '../lib/dates'

interface DayStripProps {
  days: string[]
  selected: string
  today: string
  onSelect: (date: string) => void
}

export function DayStrip({ days, selected, today, onSelect }: DayStripProps) {
  const selectedRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [selected])

  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]" role="tablist" aria-label="Day">
      <div className="flex gap-2">
        {days.map((date) => {
          const label = dayLabel(date, today)
          const isSelected = date === selected
          const isToday = date === today
          return (
            <button
              key={date}
              ref={isSelected ? selectedRef : undefined}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-label={label.relative ?? `${label.weekday} ${label.day} ${label.month}`}
              onClick={() => onSelect(date)}
              className={`flex min-w-14 shrink-0 flex-col items-center rounded-xl px-2 py-2 transition ${
                isSelected ? 'bg-brand text-white' : 'bg-white text-neutral-900 hover:bg-line/50'
              }`}
            >
              <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-muted'}`}>{label.weekday}</span>
              <span className="text-xl font-semibold leading-tight tabular-nums">{label.day}</span>
              <span
                className={`mt-1 h-1.5 w-1.5 rounded-full ${isToday ? (isSelected ? 'bg-white' : 'bg-accent') : 'bg-transparent'}`}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
