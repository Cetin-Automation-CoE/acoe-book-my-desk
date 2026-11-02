import { describe, expect, it } from 'vitest'
import { coverCrop } from './image'

describe('coverCrop', () => {
  it('takes the centred square out of a landscape photo', () => {
    expect(coverCrop(4000, 3000)).toEqual({ sx: 500, sy: 0, s: 3000 })
  })

  it('takes the centred square out of a portrait photo', () => {
    expect(coverCrop(3000, 4000)).toEqual({ sx: 0, sy: 500, s: 3000 })
  })

  it('keeps a square as it is', () => {
    expect(coverCrop(800, 800)).toEqual({ sx: 0, sy: 0, s: 800 })
  })
})
