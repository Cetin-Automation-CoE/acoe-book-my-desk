import { describe, expect, it } from 'vitest'
import { addDays, bookableDays, dayLabel, minutesSinceMidnightIn, todayIn } from './dates'

const TZ = 'Europe/Prague'

describe('todayIn', () => {
  it('uses the Prague calendar date, not UTC, in winter (UTC+1)', () => {
    expect(todayIn(TZ, new Date('2026-11-02T23:30:00Z'))).toBe('2026-11-03')
  })

  it('uses the Prague calendar date in summer (UTC+2)', () => {
    expect(todayIn(TZ, new Date('2026-07-01T22:30:00Z'))).toBe('2026-07-02')
  })

  it('keeps the same date when both clocks agree', () => {
    expect(todayIn(TZ, new Date('2026-11-03T05:00:00Z'))).toBe('2026-11-03')
  })
})

describe('addDays', () => {
  it('crosses a month end', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
  })

  it('crosses a year end', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('handles leap days', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('is unaffected by the DST change', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29')
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
  })
})

describe('bookableDays', () => {
  it('returns today plus the window length', () => {
    const days = bookableDays('2026-11-03', 7)
    expect(days).toHaveLength(8)
    expect(days[0]).toBe('2026-11-03')
    expect(days[7]).toBe('2026-11-10')
  })

  it('returns only today for a zero-day window', () => {
    expect(bookableDays('2026-11-03', 0)).toEqual(['2026-11-03'])
  })
})

describe('minutesSinceMidnightIn', () => {
  it('converts a UTC instant to Prague wall-clock minutes in winter', () => {
    expect(minutesSinceMidnightIn(TZ, new Date('2026-11-02T09:30:00Z'))).toBe(10 * 60 + 30)
  })

  it('converts a UTC instant to Prague wall-clock minutes in summer', () => {
    expect(minutesSinceMidnightIn(TZ, new Date('2026-07-01T07:15:00Z'))).toBe(9 * 60 + 15)
  })
})

describe('dayLabel', () => {
  it('labels today and tomorrow by name', () => {
    expect(dayLabel('2026-11-03', '2026-11-03').relative).toBe('Today')
    expect(dayLabel('2026-11-04', '2026-11-03').relative).toBe('Tomorrow')
    expect(dayLabel('2026-11-05', '2026-11-03').relative).toBeUndefined()
  })

  it('gives a short weekday, day number and month', () => {
    const label = dayLabel('2026-11-05', '2026-11-03')
    expect(label.weekday).toBe('Thu')
    expect(label.day).toBe('5')
    expect(label.month).toBe('Nov')
  })
})
