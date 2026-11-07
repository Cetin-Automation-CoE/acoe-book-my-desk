import { useRef } from 'react'
import type { DayPicker } from '../hooks/useDayPicker'
import { useT } from '../hooks/useLang'
import { dayLabel, formatRange, gapsBefore, weekRelative } from '../lib/dates'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'

interface DayStripProps {
  picker: DayPicker
  today: string
  // Days where I have a booking (sky dot).
  mine?: ReadonlySet<string>
}

// A horizontal swipe this long, and clearly more sideways than down, changes the week.
const SWIPE_PX = 48

// One pill per working day of the week on show, on the band. Days already gone stay in place, dimmed,
// so every week has the same shape. When the window spans more than one week, a header names the
// week and its arrows (or a sideways swipe across the pills) move between weeks.
export function DayStrip({ picker, today, mine }: DayStripProps) {
  const t = useT()
  const { week, selected, select, prevWeek, nextWeek, moved } = picker
  const days = week.days
  const gaps = gapsBefore(days)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const relative = weekRelative(week.monday, today)
  const range = days.length > 0 ? formatRange(days[0], days[days.length - 1]) : ''

  const arrow = 'flex h-8 w-8 items-center justify-center rounded-full bg-white/12 text-white transition active:scale-90 disabled:opacity-30 disabled:active:scale-100'

  return (
    <>
      {picker.weeks.length > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[13px] leading-5" aria-live="polite">
            {relative && <span className="font-bold uppercase tracking-[0.06em] text-white/80">{relative}</span>}
            {relative && <span className="text-white/45"> · </span>}
            <span className="font-semibold text-white/60">{range}</span>
          </p>
          <div className="flex shrink-0 gap-1.5">
            <button type="button" className={arrow} aria-label={t.days.weekPrev} disabled={!prevWeek} onClick={prevWeek}>
              <ChevronLeftIcon width={18} height={18} strokeWidth={2.2} />
            </button>
            <button type="button" className={arrow} aria-label={t.days.weekNext} disabled={!nextWeek} onClick={nextWeek}>
              <ChevronRightIcon width={18} height={18} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      )}
      <div
        key={week.monday}
        className={`flex gap-1.5 ${picker.weeks.length > 1 ? 'mt-2.5' : 'mt-5'} ${moved === 1 ? 'week-in-next' : moved === -1 ? 'week-in-prev' : ''}`}
        role="tablist"
        aria-label={t.days.pick}
        onTouchStart={(e) => {
          const p = e.touches[0]
          touch.current = { x: p.clientX, y: p.clientY }
        }}
        onTouchEnd={(e) => {
          const start = touch.current
          touch.current = null
          const p = e.changedTouches[0]
          if (!start || !p) return
          const dx = p.clientX - start.x
          const dy = p.clientY - start.y
          if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < 1.5 * Math.abs(dy)) return
          if (dx < 0) nextWeek?.()
          else prevWeek?.()
        }}
      >
        {days.map((date) => {
          const label = dayLabel(date, today)
          const past = date < today
          const isSelected = date === selected
          const isToday = date === today
          const isMine = mine?.has(date) ?? false
          return (
            <button
              key={date}
              type="button"
              role="tab"
              aria-selected={isSelected}
              disabled={past}
              aria-label={label.relative ?? `${label.weekday} ${label.day} ${label.month}`}
              onClick={() => select(date)}
              className={`flex min-w-0 flex-1 flex-col items-center rounded-2xl pb-[7px] pt-2 transition active:scale-95 disabled:opacity-35 disabled:active:scale-100 ${
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
                {isMine && !past && <span className={`h-[5px] w-[5px] rounded-full ${isSelected ? 'bg-brand' : 'bg-sky'}`} />}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
