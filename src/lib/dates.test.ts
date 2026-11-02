import { describe, expect, it } from 'vitest'
import { addDays, bookableDays, canCancel, checkInState, dayLabel, minutesSinceMidnightIn, todayIn } from './dates'
import type { Booking, Settings } from './types'

const TZ = 'Europe/Prague'

const settings: Settings = {
  id: true,
  allowed_email_domains: ['cetin.cz'],
  timezone: TZ,
  booking_window_days: 7,
  am_start: '06:00:00',
  pm_start: '13:00:00',
  am_checkin_deadline: '10:00:00',
  pm_checkin_deadline: '14:00:00',
  owner_checkin_exempt: true,
  max_days_per_week: null,
  booking_retention_days: 90,
  updated_at: '',
}

function booking(over: Partial<Booking> = {}): Booking {
  return {
    id: 'b1',
    seat_id: 's1',
    user_id: 'me',
    date: '2026-11-04',
    slot: 'AM',
    status: 'booked',
    checked_in_at: null,
    created_at: '',
    updated_at: '',
    ...over,
  }
}

// Wednesday 2026-11-04 in Prague (UTC+1)
const at = (hhmm: string) => new Date(`2026-11-04T${hhmm}:00+01:00`)

describe('checkInState', () => {
  it('is open on the day before the deadline', () => {
    expect(checkInState(booking(), settings, false, at('09:00'))).toBe('open')
  })

  it('is closed on the day after the deadline', () => {
    expect(checkInState(booking(), settings, false, at('10:01'))).toBe('closed')
  })

  it('uses the PM deadline for afternoon bookings', () => {
    expect(checkInState(booking({ slot: 'PM' }), settings, false, at('13:30'))).toBe('open')
    expect(checkInState(booking({ slot: 'PM' }), settings, false, at('14:01'))).toBe('closed')
  })

  it('is not_today for a future booking', () => {
    expect(checkInState(booking({ date: '2026-11-05' }), settings, false, at('09:00'))).toBe('not_today')
  })

  it('is exempt for the owner of a semi-fixed seat', () => {
    expect(checkInState(booking(), settings, true, at('09:00'))).toBe('exempt')
  })

  it('is done once checked in', () => {
    expect(checkInState(booking({ status: 'checked_in' }), settings, false, at('09:00'))).toBe('done')
  })
})

describe('canCancel', () => {
  it('allows cancelling a future booking', () => {
    expect(canCancel(booking({ date: '2026-11-05' }), settings, at('23:00'))).toBe(true)
  })

  it('refuses once the half day has started', () => {
    expect(canCancel(booking(), settings, at('09:00'))).toBe(false)
    expect(canCancel(booking({ slot: 'PM' }), settings, at('13:00'))).toBe(false)
  })

  it('allows cancelling a later half day on the same day', () => {
    expect(canCancel(booking({ slot: 'PM' }), settings, at('09:00'))).toBe(true)
  })

  it('refuses for anything that is not booked', () => {
    expect(canCancel(booking({ date: '2026-11-05', status: 'checked_in' }), settings, at('09:00'))).toBe(false)
  })
})

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
