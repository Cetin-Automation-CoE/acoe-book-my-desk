import type { SeatView } from '../lib/seatState'
import { strings } from '../strings'

interface SeatGridProps {
  views: SeatView[]
  names: Map<string, string>
  onTap: (view: SeatView) => void
}

const tileStyles: Record<SeatView['kind'], string> = {
  free: 'bg-white border border-brand/40 text-brand hover:border-brand',
  partly: 'bg-white border border-dashed border-brand/60 text-brand hover:border-brand',
  mine: 'bg-brand text-white',
  taken: 'bg-line text-neutral-700',
  held: 'bg-lilac-soft/50 text-brand-deep',
  inactive: 'hidden',
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
    case 'held':
      return view.seat.owner_id ? strings.seats.heldBy(nameOf(names, view.seat.owner_id)) : strings.seats.held
    default:
      return ''
  }
}

export function SeatGrid({ views, names, onTap }: SeatGridProps) {
  const visible = views.filter((v) => v.kind !== 'inactive')
  if (visible.length === 0) return <p className="text-muted">{strings.seats.noSeats}</p>

  return (
    <ul className="grid grid-cols-3 gap-3">
      {visible.map((view) => {
        const tappable = view.bookableSlots.length > 0 || view.mineSlots.length > 0
        return (
          <li key={view.seat.id}>
            <button
              type="button"
              disabled={!tappable}
              onClick={() => onTap(view)}
              aria-label={`${view.seat.code}: ${caption(view, names)}`}
              className={`flex aspect-square w-full flex-col justify-between rounded-xl p-3 text-left transition active:scale-[0.97] disabled:active:scale-100 ${tileStyles[view.kind]}`}
            >
              <span className="text-base font-semibold tabular-nums">{view.seat.code}</span>
              <span className="line-clamp-2 text-sm leading-snug">{caption(view, names)}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
