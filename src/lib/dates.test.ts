import { describe, expect, it } from 'vitest'
import { setLang } from '../strings'
import {
  addDays,
  bookableDays,
  bookingWeeks,
  canCancel,
  canCancelAll,
  dayChoice,
  dayLabel,
  formatRange,
  isoWeekday,
  minutesSinceMidnightIn,
  mondayOf,
  todayIn,
  weekRelative,
  windowWeeks,
} from './dates'
import type { Booking, Settings } from './types'

const TZ = 'Europe/Prague'

const settings: Settings = {
  id: true,
  allowed_email_domains: ['cetin.cz'],
  timezone: TZ,
  am_start: '06:00:00',
  pm_start: '13:00:00',
  max_days_per_week: null,
  booking_weeks: 2,
  booking_retention_days: 90,
  working_days: [1, 2, 3, 4, 5],
  push_function_url: null,
  push_evening_hour: 17,
  push_monday_hour: 7,
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
    counted_at: null,
    created_at: '',
    updated_at: '',
    ...over,
  }
}

// Wednesday 2026-11-04 in Prague (UTC+1)
const at = (hhmm: string) => new Date(`2026-11-04T${hhmm}:00+01:00`)

describe('canCancel', () => {
  it('allows cancelling a future booking', () => {
    expect(canCancel(booking({ date: '2026-11-05' }), settings, at('23:00'))).toBe(true)
  })

  it('allows cancelling on the day, also once it has started', () => {
    expect(canCancel(booking(), settings, at('05:00'))).toBe(true)
    expect(canCancel(booking(), settings, at('09:00'))).toBe(true)
    expect(canCancel(booking({ slot: 'PM' }), settings, at('13:00'))).toBe(true)
    expect(canCancel(booking({ slot: 'PM' }), settings, at('23:59'))).toBe(true)
  })

  it('refuses for a day that is over', () => {
    expect(canCancel(booking({ date: '2026-11-03' }), settings, at('00:01'))).toBe(false)
  })

  it('refuses for anything that is not booked', () => {
    expect(canCancel(booking({ date: '2026-11-05', status: 'cancelled' }), settings, at('09:00'))).toBe(false)
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
  const WEEKDAYS = [1, 2, 3, 4, 5]

  it('runs from today to Friday of the current week', () => {
    // Tuesday 3 Nov
    expect(bookableDays('2026-11-03', WEEKDAYS)).toEqual(['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'])
  })

  it('is the whole week on a Monday and only Friday on a Friday', () => {
    expect(bookableDays('2026-11-02', WEEKDAYS)).toHaveLength(5)
    expect(bookableDays('2026-11-06', WEEKDAYS)).toEqual(['2026-11-06'])
  })

  it('shows the coming week on a weekend', () => {
    expect(bookableDays('2026-11-07', WEEKDAYS)).toEqual(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'])
    expect(bookableDays('2026-11-08', WEEKDAYS)[0]).toBe('2026-11-09')
  })

  it('includes Saturday when it is a working day', () => {
    expect(bookableDays('2026-11-06', [1, 2, 3, 4, 5, 6])).toEqual(['2026-11-06', '2026-11-07'])
  })
})

describe('bookingWeeks', () => {
  const WEEKDAYS = [1, 2, 3, 4, 5]

  it('is this week and next by default, each with every working day', () => {
    // Wednesday 4 Nov
    expect(bookingWeeks('2026-11-04', WEEKDAYS, 2)).toEqual([
      { monday: '2026-11-02', days: ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'] },
      { monday: '2026-11-09', days: ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'] },
    ])
  })

  it('starts with the coming week on a weekend', () => {
    expect(bookingWeeks('2026-11-07', WEEKDAYS, 2).map((w) => w.monday)).toEqual(['2026-11-09', '2026-11-16'])
  })

  it('runs across a month and a year end', () => {
    expect(bookingWeeks('2026-12-30', WEEKDAYS, 2)[1].days).toEqual(['2027-01-04', '2027-01-05', '2027-01-06', '2027-01-07', '2027-01-08'])
  })
})

describe('bookableDays over several weeks', () => {
  it('runs from today to Friday of next week', () => {
    // Thursday 5 Nov
    expect(bookableDays('2026-11-05', [1, 2, 3, 4, 5], 2)).toEqual([
      '2026-11-05',
      '2026-11-06',
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
    ])
  })

  it('opens two whole weeks from the weekend', () => {
    const days = bookableDays('2026-11-08', [1, 2, 3, 4, 5], 2)
    expect(days[0]).toBe('2026-11-09')
    expect(days[days.length - 1]).toBe('2026-11-20')
    expect(days).toHaveLength(10)
  })
})

describe('windowWeeks', () => {
  it('reads booking_weeks, and falls back to the current week before the column exists', () => {
    expect(windowWeeks({ booking_weeks: 3 })).toBe(3)
    expect(windowWeeks({} as Pick<Settings, 'booking_weeks'>)).toBe(1)
  })
})

describe('mondayOf', () => {
  it('finds the Monday of the ISO week', () => {
    expect(mondayOf('2026-11-02')).toBe('2026-11-02')
    expect(mondayOf('2026-11-08')).toBe('2026-11-02')
    expect(mondayOf('2027-01-01')).toBe('2026-12-28')
  })
})

describe('weekRelative', () => {
  it('names this week and next, relative to the calendar week of today', () => {
    expect(weekRelative('2026-11-02', '2026-11-05')).toBe('This week')
    expect(weekRelative('2026-11-09', '2026-11-05')).toBe('Next week')
    expect(weekRelative('2026-11-16', '2026-11-05')).toBeUndefined()
    // On Saturday the coming week is next week, not this one.
    expect(weekRelative('2026-11-09', '2026-11-07')).toBe('Next week')
  })
})

describe('formatRange', () => {
  it('writes a week as one range, in English and Czech', () => {
    expect(formatRange('2026-11-09', '2026-11-13')).toBe('9–13 Nov')
    expect(formatRange('2026-11-30', '2026-12-04')).toBe('30 Nov – 4 Dec')
    setLang('cs')
    try {
      expect(formatRange('2026-11-09', '2026-11-13')).toBe('9.–13. 11.')
      expect(formatRange('2026-11-30', '2026-12-04')).toBe('30. 11. – 4. 12.')
    } finally {
      setLang('en')
    }
  })
})

describe('isoWeekday', () => {
  it('gives 1 for Monday and 7 for Sunday', () => {
    expect(isoWeekday('2026-11-02')).toBe(1)
    expect(isoWeekday('2026-11-08')).toBe(7)
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

describe('dayChoice', () => {
  const today = '2026-11-04'
  it('is the full day for a later day', () => {
    expect(dayChoice('2026-11-05', today, 23 * 60, settings)).toBe('FULL')
  })
  it('is the full day for today before the afternoon starts', () => {
    expect(dayChoice(today, today, 12 * 60 + 59, settings)).toBe('FULL')
  })
  it('is the rest of the day once the afternoon has started', () => {
    expect(dayChoice(today, today, 13 * 60, settings)).toBe('PM')
  })
})

describe('canCancelAll', () => {
  it('needs every booking of the day to be cancellable', () => {
    expect(canCancelAll([booking(), booking({ id: 'b2', slot: 'PM' })], settings, at('09:00'))).toBe(true)
    expect(canCancelAll([booking(), booking({ id: 'b2', slot: 'PM', status: 'cancelled' })], settings, at('09:00'))).toBe(false)
  })
  it('is false for no bookings', () => {
    expect(canCancelAll([], settings, at('05:00'))).toBe(false)
  })
})
