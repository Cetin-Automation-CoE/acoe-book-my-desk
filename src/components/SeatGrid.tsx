import { useT } from '../hooks/useLang'
import { roomBlocks } from '../lib/layout'
import type { SeatView } from '../lib/seatState'
import type { PeopleMap } from '../lib/types'
import { SeatTile } from './SeatTile'

interface SeatGridProps {
  views: SeatView[]
  people: PeopleMap
  userId: string
  myName: string
  // Free seats I may not book (I already have one that day, or I own another): shown, not tappable.
  isBlocked: (view: SeatView) => boolean
  flashId: string | null
  selectedId: string | null
  favouriteId: string | null
  // The seat "Surprise me" is passing over, if it is shuffling.
  spotlightId?: string | null
  onTap: (view: SeatView) => void
}

// The room: two desks side by side form a pair, two pairs form a table block, then an aisle.
// Seats arrive in room order (seats.sort_order), so the grid mirrors the floor without a map.
export const PAIRS_PER_BLOCK = 2

export function SeatGrid({ views, people, userId, myName, isBlocked, flashId, selectedId, favouriteId, spotlightId = null, onTap }: SeatGridProps) {
  const t = useT()
  if (views.length === 0) return <p className="text-muted">{t.seats.noSeats}</p>

  const legend = [
    { label: t.seats.free, className: 'border-[1.5px] border-brand/40 bg-white' },
    { label: t.seats.mine, className: 'bg-mine' },
    { label: t.seats.taken, className: 'bg-taken' },
    { label: t.seats.held, className: 'bg-lilac-soft/60' },
  ]
  let index = 0

  return (
    <>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-[19px] font-extrabold leading-6 tracking-[-0.01em]">{t.seats.title}</h2>
        <ul className="flex flex-wrap justify-end gap-x-2.5 gap-y-1 text-xs font-semibold leading-4 text-muted">
          {legend.map((l) => (
            <li key={l.label} className="flex items-center gap-[5px]">
              <span aria-hidden className={`h-2.5 w-2.5 rounded-[3px] ${l.className}`} />
              {l.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-[18px]">
        {roomBlocks(views, PAIRS_PER_BLOCK).map((block, b) => {
          const free = block.flat().filter((v) => v.kind === 'free').length
          return (
            <section key={b} aria-label={t.seats.table(b + 1)}>
              <div className="flex items-baseline justify-between px-1 pb-[7px] text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted">
                <span>{t.seats.table(b + 1)}</span>
                <span className={free > 0 ? 'text-brand' : ''}>{t.seats.freeShort(free)}</span>
              </div>
              <div className="rounded-[22px] bg-white p-2 shadow-card">
                {block.map((pair, p) => (
                  <div
                    key={p}
                    className={`grid grid-cols-2 gap-1.5 ${p > 0 ? 'mt-1.5 border-t-[1.5px] border-dashed border-divider pt-1.5' : ''}`}
                  >
                    {pair.map((view) => (
                      <SeatTile
                        key={view.seat.id}
                        view={view}
                        people={people}
                        userId={userId}
                        myName={myName}
                        blocked={isBlocked(view)}
                        flash={flashId === view.seat.id}
                        selected={selectedId === view.seat.id}
                        favourite={favouriteId === view.seat.id}
                        spotlight={spotlightId === view.seat.id}
                        index={index++}
                        onTap={onTap}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}
