// The Book tab's "smart card": the usual seat and the nearest alternative.
// Pure functions; the database is still the authority on every booking.

import { roomBlocks } from './layout'
import type { SeatView } from './seatState'
import type { Booking, Slot, SlotChoice } from './types'

// The seat booked most often in the recent window; ties go to the most recent booking.
// Seat owners' usual seat is their own.
export function usualSeat(recent: readonly { seat_id: string; date: string }[], ownerSeatId: string | null): string | null {
  if (ownerSeatId) return ownerSeatId
  const count = new Map<string, { n: number; last: string }>()
  for (const b of recent) {
    const c = count.get(b.seat_id) ?? { n: 0, last: '' }
    c.n += 1
    if (b.date > c.last) c.last = b.date
    count.set(b.seat_id, c)
  }
  let best: string | null = null
  let bestScore = { n: 0, last: '' }
  for (const [id, c] of count) {
    if (c.n > bestScore.n || (c.n === bestScore.n && c.last > bestScore.last)) {
      best = id
      bestScore = c
    }
  }
  return best
}

export type Nearness = 'pair' | 'table' | 'closest'

const seatNumber = (code: string) => Number(/\d+$/.exec(code)?.[0] ?? 0)

// Among the candidate seats, the one nearest to the usual seat: its pair partner, then the same
// table, then the smallest seat-number distance.
export function alternativeSeat(
  usualId: string,
  candidateIds: readonly string[],
  seatsInRoomOrder: readonly { id: string; code: string }[],
  pairsPerBlock = 2,
): { seatId: string; nearness: Nearness } | null {
  if (candidateIds.length === 0) return null
  const candidates = new Set(candidateIds)
  const blocks = roomBlocks([...seatsInRoomOrder], pairsPerBlock)
  for (const block of blocks) {
    const pair = block.find((p) => p.some((s) => s.id === usualId))
    if (!pair) continue
    const partner = pair.find((s) => s.id !== usualId)
    if (partner && candidates.has(partner.id)) return { seatId: partner.id, nearness: 'pair' }
    const sameTable = block.flat().find((s) => s.id !== usualId && candidates.has(s.id))
    if (sameTable) return { seatId: sameTable.id, nearness: 'table' }
  }
  const usual = seatsInRoomOrder.find((s) => s.id === usualId)
  const n = usual ? seatNumber(usual.code) : 0
  const closest = [...seatsInRoomOrder]
    .filter((s) => candidates.has(s.id))
    .sort((a, b) => Math.abs(seatNumber(a.code) - n) - Math.abs(seatNumber(b.code) - n))[0]
  return closest ? { seatId: closest.id, nearness: 'closest' } : null
}

export type CardVariant =
  | { kind: 'booked'; bookings: Booking[]; slotLabel: SlotChoice }
  | { kind: 'usual'; seatId: string; slot: SlotChoice }
  | { kind: 'alternative'; seatId: string; nearness: Nearness; slot: SlotChoice; usualId: string }

interface CardArgs {
  // My active bookings on the selected day.
  mine: Booking[]
  usualId: string | null
  views: SeatView[]
  choice: SlotChoice
}

const slotLabelOf = (slots: Slot[]): SlotChoice => (slots.includes('AM') && slots.includes('PM') ? 'FULL' : slots[0])

// Which card the Book tab shows for the selected day: my booking, my usual seat, or the nearest free seat.
export function cardVariant({ mine, usualId, views, choice }: CardArgs): CardVariant | null {
  if (mine.length > 0) return { kind: 'booked', bookings: mine, slotLabel: slotLabelOf(mine.map((b) => b.slot)) }
  if (!usualId) return null
  const usual = views.find((v) => v.seat.id === usualId)
  if (usual && usual.bookableSlots.length > 0) {
    const slot: SlotChoice = usual.bookableSlots.length === usual.wantedSlots.length ? choice : usual.bookableSlots[0]
    return { kind: 'usual', seatId: usualId, slot }
  }
  const candidates = views
    .filter((v) => v.wantedSlots.length > 0 && v.bookableSlots.length === v.wantedSlots.length)
    .map((v) => v.seat.id)
  const alt = alternativeSeat(usualId, candidates, views.map((v) => v.seat))
  return alt ? { kind: 'alternative', seatId: alt.seatId, nearness: alt.nearness, slot: choice, usualId } : null
}
