// Calendar dates are ISO strings (YYYY-MM-DD) in the office time zone; instants are Date objects.
// The database is the authority on "today" and deadlines; these helpers only mirror it for the UI.

import { getLang, getStrings } from '../strings'
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
const locale = () => (getLang() === 'cs' ? 'cs-CZ' : 'en-GB')

export function todayIn(tz: string, at: Date = new Date()): string {
  const { year, month, day } = partsIn(tz, at)
  return `${year}-${pad(month)}-${pad(day)}`
}

export function minutesSinceMidnightIn(tz: string, at: Date = new Date()): number {
  const { hour, minute } = partsIn(tz, at)
  return hour * 60 + minute
}

// "08:40" wall-clock time of an instant in the office time zone.
export function clockIn(tz: string, at: Date): string {
  const { hour, minute } = partsIn(tz, at)
  return `${pad(hour)}:${pad(minute)}`
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

// The bookable days: today through the last working day of the current week. Past the last working
// day (the weekend) it is the coming week. Mirrors bmd_assert_window() in the database.
export function bookableDays(today: string, workingDays: readonly number[]): string[] {
  const dow = isoWeekday(today)
  const lastWorking = Math.max(...workingDays)
  let monday = addDays(today, 1 - dow)
  if (dow > lastWorking) monday = addDays(monday, 7)
  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i)
    if (d >= today && workingDays.includes(isoWeekday(d))) days.push(d)
  }
  return days
}

// Dates in the strip that do not directly follow the previous one (Friday → Monday) get a gap before them.
export function gapsBefore(days: readonly string[]): Set<string> {
  const gaps = new Set<string>()
  for (let i = 1; i < days.length; i++) if (addDays(days[i - 1], 1) !== days[i]) gaps.add(days[i])
  return gaps
}

export interface DayLabel {
  weekday: string
  weekdayLong: string
  day: string
  month: string
  relative?: string
}

function utcDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

const fmt = (date: Date, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale(), { timeZone: 'UTC', ...opts }).format(date)

export function dayLabel(isoDate: string, today: string): DayLabel {
  const date = utcDate(isoDate)
  const label: DayLabel = {
    weekday: fmt(date, { weekday: 'short' }).replace(/\.$/, ''),
    weekdayLong: fmt(date, { weekday: 'long' }),
    day: String(date.getUTCDate()),
    month: fmt(date, { month: 'short' }).replace(/\.$/, ''),
  }
  const days = getStrings().days
  if (isoDate === today) label.relative = days.today
  else if (isoDate === addDays(today, 1)) label.relative = days.tomorrow
  return label
}

// "Thu 5 Nov" / "čt 5. 11."
export function formatDayShort(isoDate: string): string {
  const l = dayLabel(isoDate, '')
  return getLang() === 'cs' ? `${l.weekday} ${l.day}. ${utcDate(isoDate).getUTCMonth() + 1}.` : `${l.weekday} ${l.day} ${l.month}`
}

// "Today, Thu 5 Nov" / "Dnes, čt 5. 11."
export function formatDayLong(isoDate: string, today: string): string {
  const l = dayLabel(isoDate, today)
  const base = formatDayShort(isoDate)
  return l.relative ? `${l.relative}, ${base}` : base
}

// Band sub line: "Monday, 2 November" / "pondělí 2. listopadu"; without the weekday: "2 November".
export function formatBandDate(isoDate: string, withWeekday: boolean): string {
  const date = utcDate(isoDate)
  if (getLang() === 'cs') {
    const dm = fmt(date, { day: 'numeric', month: 'long' })
    return withWeekday ? `${fmt(date, { weekday: 'long' })} ${dm}` : dm
  }
  const dm = `${date.getUTCDate()} ${fmt(date, { month: 'long' })}`
  return withWeekday ? `${fmt(date, { weekday: 'long' })}, ${dm}` : dm
}

// Band title: "Today" / "Tomorrow" / "Thursday".
export function dayTitle(isoDate: string, today: string): string {
  const l = dayLabel(isoDate, today)
  return l.relative ?? l.weekdayLong.charAt(0).toUpperCase() + l.weekdayLong.slice(1)
}

export function parseTime(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function formatTime(hhmm: string): string {
  return hhmm.slice(0, 5)
}

export function canCancel(b: Booking, s: Settings, now: Date = new Date()): boolean {
  if (b.status !== 'booked') return false
  const today = todayIn(s.timezone, now)
  if (b.date > today) return true
  if (b.date < today) return false
  const start = parseTime(b.slot === 'AM' ? s.am_start : s.pm_start)
  return minutesSinceMidnightIn(s.timezone, now) < start
}

export function slotStart(slot: Booking['slot'], s: Settings): number {
  return parseTime(slot === 'AM' ? s.am_start : s.pm_start)
}

export function slotEnd(slot: Booking['slot'], s: Settings): number {
  return slot === 'AM' ? parseTime(s.pm_start) : 24 * 60
}

// "06:00–13:00" for the booking sheet's slot cards.
export function slotRange(slot: 'AM' | 'PM' | 'FULL', s: Settings): string {
  const start = slot === 'PM' ? s.pm_start : s.am_start
  const end = slot === 'AM' ? s.pm_start : '24:00'
  return `${formatTime(start)}–${formatTime(end)}`
}
