import { useMemo, useState } from 'react'
import { bookingWeeks, windowWeeks, type Week } from '../lib/dates'
import type { Settings } from '../lib/types'

export interface DayPicker {
  weeks: Week[]
  // Every bookable day of the window, from today on.
  bookable: string[]
  selected: string
  select: (date: string) => void
  // The week on show (the one holding the selected day) and its place in the window.
  week: Week
  weekIndex: number
  // Moving to another week selects its first bookable day: today for this week, else its first working day.
  prevWeek?: () => void
  nextWeek?: () => void
  // Direction of the last week change, for the strip's slide-in.
  moved: -1 | 0 | 1
}

// The day strip's state for one page: the window's weeks, the selected day, and week navigation.
export function useDayPicker(today: string, settings: Settings): DayPicker {
  const count = windowWeeks(settings)
  const weeks = useMemo(() => bookingWeeks(today, settings.working_days, count), [today, settings.working_days, count])
  const bookable = useMemo(() => weeks.flatMap((w) => w.days.filter((d) => d >= today)), [weeks, today])
  const [picked, setPicked] = useState(today)
  const [moved, setMoved] = useState<-1 | 0 | 1>(0)
  // Fall back to the first bookable day when the selection is stale (day rolled over) or a weekend.
  const selected = bookable.includes(picked) ? picked : bookable[0]
  const weekIndex = Math.max(0, weeks.findIndex((w) => w.days.includes(selected)))

  const go = (delta: -1 | 1) => {
    const target = weeks[weekIndex + delta]?.days.find((d) => d >= today)
    if (!target) return
    setMoved(delta)
    setPicked(target)
  }

  return {
    weeks,
    bookable,
    selected,
    select: setPicked,
    week: weeks[weekIndex],
    weekIndex,
    prevWeek: weekIndex > 0 ? () => go(-1) : undefined,
    nextWeek: weekIndex < weeks.length - 1 ? () => go(1) : undefined,
    moved,
  }
}
