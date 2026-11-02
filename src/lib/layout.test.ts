import { describe, expect, it } from 'vitest'
import { roomBlocks } from './layout'

describe('roomBlocks', () => {
  it('pairs seats side by side and groups two pairs per table block', () => {
    const blocks = roomBlocks(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'], 2)
    expect(blocks).toEqual([
      [['a', 'b'], ['c', 'd']],
      [['e', 'f'], ['g', 'h']],
      [['i', 'j'], ['k', 'l']],
    ])
  })

  it('leaves an odd seat alone in the last pair', () => {
    expect(roomBlocks(['a', 'b', 'c'], 2)).toEqual([[['a', 'b'], ['c']]])
  })

  it('starts a new block after the configured number of pairs', () => {
    expect(roomBlocks(['a', 'b', 'c', 'd', 'e', 'f'], 1)).toEqual([[['a', 'b']], [['c', 'd']], [['e', 'f']]])
  })

  it('returns no blocks for no seats', () => {
    expect(roomBlocks([], 2)).toEqual([])
  })
})
