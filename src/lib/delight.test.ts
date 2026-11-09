import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { celebrateBadge, celebrateBooking, celebrationsOn, setCelebrations, tick } from './delight'

function fakeStorage(): Storage {
  const data = new Map<string, string>()
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size
    },
  }
}

describe('delight', () => {
  const vibrate = vi.fn()

  beforeEach(() => {
    // Reduced motion on, so the tests never load the confetti module.
    vi.stubGlobal('window', { localStorage: fakeStorage(), matchMedia: () => ({ matches: true }) })
    vi.stubGlobal('navigator', { vibrate })
    vibrate.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is on by default and remembers being switched off', () => {
    expect(celebrationsOn()).toBe(true)
    setCelebrations(false)
    expect(celebrationsOn()).toBe(false)
    setCelebrations(true)
    expect(celebrationsOn()).toBe(true)
  })

  it('stays on when storage is blocked', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('blocked')
      },
      matchMedia: () => ({ matches: true }),
    })
    expect(celebrationsOn()).toBe(true)
    expect(() => setCelebrations(false)).not.toThrow()
    // The switch still holds until the page reloads.
    expect(celebrationsOn()).toBe(false)
    celebrateBooking()
    expect(vibrate).not.toHaveBeenCalled()
    setCelebrations(true)
    expect(celebrationsOn()).toBe(true)
  })

  it('buzzes on a booking, a badge and a shuffle tick while on', () => {
    celebrateBooking()
    celebrateBadge()
    tick()
    expect(vibrate).toHaveBeenCalledTimes(3)
  })

  it('stays still when switched off', () => {
    setCelebrations(false)
    celebrateBooking()
    celebrateBadge()
    tick()
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('does not fail where there is no vibration API', () => {
    vi.stubGlobal('navigator', {})
    expect(() => celebrateBooking()).not.toThrow()
  })
})
