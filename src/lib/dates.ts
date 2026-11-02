// Calendar dates are ISO strings (YYYY-MM-DD) in the office time zone; instants are Date objects.
// The database is the authority on "today" and deadlines; these helpers only mirror it for the UI.

import { strings } from '../strings'
import type { Booking, Settings } from './types'

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

// ISO weekday: 1 = Monday … 7 = Sunday.
export function isoWeekday(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return dow === 0 ? 7 : dow
}

export function bookableDays(today: string, windowDays: number, workingDays: readonly number[]): string[] {
  return Array.from({ length: windowDays + 1 }, (_, i) => addDays(today, i)).filter((d) =>
    workingDays.includes(isoWeekday(d)),
  )
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

export type CheckInState = 'open' | 'closed' | 'not_today' | 'exempt' | 'done'

export function checkInState(b: Booking, s: Settings, ownerOfSeat: boolean, now: Date = new Date()): CheckInState {
  if (b.status === 'checked_in') return 'done'
  if (ownerOfSeat && s.owner_checkin_exempt) return 'exempt'
  if (b.date !== todayIn(s.timezone, now)) return 'not_today'
  const deadline = parseTime(b.slot === 'AM' ? s.am_checkin_deadline : s.pm_checkin_deadline)
  return minutesSinceMidnightIn(s.timezone, now) > deadline ? 'closed' : 'open'
}

export function canCancel(b: Booking, s: Settings, now: Date = new Date()): boolean {
  if (b.status !== 'booked') return false
  const today = todayIn(s.timezone, now)
  if (b.date > today) return true
  if (b.date < today) return false
  const start = parseTime(b.slot === 'AM' ? s.am_start : s.pm_start)
  return minutesSinceMidnightIn(s.timezone, now) < start
}
