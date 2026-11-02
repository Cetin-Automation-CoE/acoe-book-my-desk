import { roomBlocks } from '../lib/layout'
import type { SeatView } from '../lib/seatState'
import { strings } from '../strings'

interface SeatGridProps {
  views: SeatView[]
  names: Map<string, string>
  onTap: (view: SeatView) => void
}

// The room: two desks side by side form a pair, two pairs form a table block, then an aisle.
// Seats arrive in room order (seats.sort_order), so the grid mirrors the floor without a map.
const PAIRS_PER_BLOCK = 2

const tileStyles: Record<SeatView['kind'], string> = {
  free: 'bg-white border border-brand/40 text-brand hover:border-brand',
  partly: 'bg-white border border-dashed border-brand/60 text-brand hover:border-brand',
  mine: 'bg-brand text-white',
  taken: 'bg-line text-neutral-700',
  held: 'bg-lilac-soft/50 text-brand-deep',
  inactive: 'bg-surface border border-dashed border-line-strong text-muted',
}

function nameOf(names: Map<string, string>, userId: string) {
  return names.get(userId) ?? '…'
}

function caption(view: SeatView, names: Map<string, string>): string {
  switch (view.kind) {
    case 'free':
      return strings.seats.free
    case 'partly':
      return `${strings.slots[view.bookableSlots[0]]} ${strings.seats.free.toLowerCase()}`
    case 'mine':
      return view.mineSlots.length === 1 && view.wantedSlots.length > 1
        ? `${strings.seats.mine} · ${strings.slots.short[view.mineSlots[0]]}`
        : strings.seats.mine
    case 'taken': {
      const distinct = [...new Set(view.takenBy)]
      return distinct.length === 1 ? nameOf(names, distinct[0]) : strings.seats.taken
    }
    case 'held': {
      const ownerName = (view.seat.owner_id && names.get(view.seat.owner_id)) || view.seat.owner_name
      return ownerName ? strings.seats.heldBy(ownerName) : strings.seats.held
    }
    case 'inactive':
      return strings.seats.inactive
  }
}

export function SeatGrid({ views, names, onTap }: SeatGridProps) {
  if (views.length === 0) return <p className="text-muted">{strings.seats.noSeats}</p>

  return (
    <div className="flex flex-col gap-6">
      {roomBlocks(views, PAIRS_PER_BLOCK).map((block, b) => (
        <ul key={b} className="flex flex-col gap-2" aria-label={`Table ${b + 1}`}>
          {block.map((pair, p) => (
            <li key={p} className={p > 0 ? 'border-t border-line-strong pt-2' : ''}>
              <div className="grid grid-cols-2 gap-2">
                {pair.map((view) => {
                  const tappable = view.bookableSlots.length > 0 || view.mineSlots.length > 0
                  const text = caption(view, names)
                  return (
                    <button
                      key={view.seat.id}
                      type="button"
                      disabled={!tappable}
                      onClick={() => onTap(view)}
                      aria-label={`${view.seat.code}: ${text}`}
                      className={`flex min-h-[4.5rem] flex-col justify-between rounded-xl px-3 py-2.5 text-left transition active:scale-[0.97] disabled:active:scale-100 ${tileStyles[view.kind]}`}
                    >
                      <span className="text-base font-semibold tabular-nums">{view.seat.code}</span>
                      <span className="line-clamp-2 text-sm leading-snug">{text}</span>
                    </button>
                  )
                })}
              </div>
            </li>
          ))}
        </ul>
      ))}
    </div>
  )
}
