import { describe, expect, it } from 'vitest'
import { dragOutcome } from './sheet'

describe('dragOutcome', () => {
  it('closes when the sheet was pulled far enough', () => {
    expect(dragOutcome({ offset: 140, velocity: 0, height: 600 })).toBe('close')
  })

  it('snaps back after a short pull', () => {
    expect(dragOutcome({ offset: 40, velocity: 0, height: 600 })).toBe('snap')
  })

  it('closes on a quick flick even after a short pull', () => {
    expect(dragOutcome({ offset: 40, velocity: 1.2, height: 600 })).toBe('close')
  })

  it('does not close on a flick that barely moved', () => {
    expect(dragOutcome({ offset: 8, velocity: 1.2, height: 600 })).toBe('snap')
  })

  it('needs less distance on a short sheet', () => {
    expect(dragOutcome({ offset: 70, velocity: 0, height: 180 })).toBe('close')
  })

  it('snaps back when pulled upwards', () => {
    expect(dragOutcome({ offset: -30, velocity: -1, height: 600 })).toBe('snap')
  })
})
