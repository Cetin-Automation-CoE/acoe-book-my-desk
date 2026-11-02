// Calendar dates are ISO strings (YYYY-MM-DD) in the office time zone; instants are Date objects.
// The database is the authority on "today" and deadlines; these helpers only mirror it for the UI.

import { strings } from '../strings'

function partsIn(tz: string, at: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') }
}

const pad = (n: number) => String(n).padStart(2, '0')

export function todayIn(tz: string, at: Date = new Date()): string {
  const { year, month, day } = partsIn(tz, at)
  return `${year}-${pad(month)}-${pad(day)}`
}

export function minutesSinceMidnightIn(tz: string, at: Date = new Date()): number {
  const { hour, minute } = partsIn(tz, at)
  return hour * 60 + minute
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d + days))
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`
}

export function bookableDays(today: string, windowDays: number): string[] {
  return Array.from({ length: windowDays + 1 }, (_, i) => addDays(today, i))
}

export interface DayLabel {
  weekday: string
  day: string
  month: string
  relative?: string
}

export function dayLabel(isoDate: string, today: string): DayLabel {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...opts }).format(date)
  const label: DayLabel = {
    weekday: fmt({ weekday: 'short' }),
    day: String(d),
    month: fmt({ month: 'short' }),
  }
  if (isoDate === today) label.relative = strings.days.today
  else if (isoDate === addDays(today, 1)) label.relative = strings.days.tomorrow
  return label
}

export function formatDayLong(isoDate: string, today: string): string {
  const l = dayLabel(isoDate, today)
  const base = `${l.weekday} ${l.day} ${l.month}`
  return l.relative ? `${l.relative}, ${base}` : base
}

export function parseTime(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function formatTime(hhmm: string): string {
  return hhmm.slice(0, 5)
}
