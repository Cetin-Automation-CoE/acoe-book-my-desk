import { useT } from '../hooks/useLang'
import { shortName } from '../lib/people'
import type { HalfState, SeatView } from '../lib/seatState'
import { SLOTS, type Slot } from '../lib/types'
import { Avatar } from './Avatar'
import { StarIcon } from './icons'

export interface SeatTileProps {
  view: SeatView
  names: Map<string, string>
  userId: string
  myName: string
  // Halves I already hold on another seat that day: those halves are not bookable for me.
  myHeldSlots: ReadonlySet<Slot>
  // Halves of the selected day that are already over.
  endedSlots: ReadonlySet<Slot>
  flash: boolean
  selected: boolean
  index: number
  onTap: (view: SeatView) => void
}

type Look = 'free' | 'partly' | 'mine' | 'taken' | 'held' | 'ended' | 'inactive'

const tile: Record<Look, string> = {
  free: 'bg-white border-brand/16 text-brand',
  partly: 'bg-white border-dashed border-brand/45 text-brand',
  mine: 'bg-mine border-brand text-white shadow-mine',
  taken: 'bg-taken border-taken text-taken-ink',
  held: 'bg-lilac-soft/32 border-transparent text-lilac',
  ended: 'bg-transparent border-dashed border-line-strong text-[#b4b6c6]',
  inactive: 'bg-transparent border-dashed border-line-strong text-[#b4b6c6]',
}

function halfColor(state: HalfState | undefined, look: Look): string {
  switch (state) {
    case 'mine':
      return look === 'mine' ? '#fff' : '#300091'
    case 'taken':
      return '#a6a8bf'
    case 'held':
      return '#6f79bd'
    default:
      return '#300091'
  }
}

// One seat in the grid: big desk number, who has it, and in Full-day mode a glyph of both halves.
export function SeatTile(props: SeatTileProps) {
  const { view, names, userId, myName, myHeldSlots, endedSlots, flash, selected, index, onTap } = props
  const t = useT()
  const nameOf = (id: string) => (id === userId ? myName : (names.get(id) ?? '…'))

  const allEnded = view.wantedSlots.length > 0 && view.wantedSlots.every((s) => endedSlots.has(s))
  const look: Look =
    view.kind === 'inactive' ? 'inactive' : allEnded && (view.kind === 'free' || view.kind === 'partly') ? 'ended' : view.kind

  const bookableForMe = view.bookableSlots.filter((s) => !myHeldSlots.has(s) && !endedSlots.has(s))
  const tappable = bookableForMe.length > 0 || view.mineSlots.length > 0
  const dimmed = (look === 'free' || look === 'partly') && bookableForMe.length === 0

  // Caption and sub line
  let caption = ''
  let sub = ''
  let avatarId: string | null = null
  let star = false

  switch (look) {
    case 'free':
      caption = t.seats.free
      break
    case 'partly': {
      const free = view.bookableSlots[0]
      caption = t.slots[free]
      const other = view.wantedSlots.find((s) => s !== free)
      const half = other ? view.halves[other] : undefined
      if (other && half) {
        const who =
          half.state === 'mine' ? t.you : half.state === 'held' ? t.seats.held : half.booking ? shortName(nameOf(half.booking.user_id)) : ''
        sub = t.seats.other(t.slots.short[other], who)
      }
      break
    }
    case 'mine': {
      caption = t.you
      if (view.wantedSlots.length > 1 && view.mineSlots.length === 1) sub = t.slots[view.mineSlots[0]]
      break
    }
    case 'taken': {
      const distinct = [...new Set(view.takenBy)]
      if (distinct.length === 1) {
        avatarId = distinct[0]
        caption = shortName(nameOf(distinct[0]))
      } else {
        caption = t.seats.taken
        sub = SLOTS.filter((s) => view.halves[s]?.booking)
          .map((s) => `${t.slots.short[s]} ${shortName(nameOf(view.halves[s]!.booking!.user_id))}`)
          .join(' · ')
      }
      break
    }
    case 'held': {
      star = true
      caption = t.seats.held
      const ownerName = (view.seat.owner_id && names.get(view.seat.owner_id)) || view.seat.owner_name
      sub = ownerName ? shortName(ownerName) : ''
      break
    }
    case 'ended':
      caption = '–'
      break
    case 'inactive':
      caption = t.seats.inactive
      break
  }

  const captionColor =
    look === 'taken' ? 'text-ink-soft' : look === 'held' ? 'text-brand-deep' : look === 'mine' ? 'text-white' : ''
  const subColor = look === 'held' ? 'text-brand-deep/70' : look === 'mine' ? 'text-white/80' : look === 'taken' ? 'text-ink-soft/80' : 'text-muted'
  const showGlyph = view.wantedSlots.length > 1 && look !== 'inactive' && look !== 'ended'
  const glyphBorder = look === 'mine' ? '#fff' : look === 'taken' ? '#9497b0' : look === 'held' ? '#6f79bd' : '#300091'
  const left = halfColor(view.halves.AM?.state, look)
  const right = halfColor(view.halves.PM?.state, look)

  return (
    <div className="enter" style={{ '--i': index } as React.CSSProperties}>
      <button
        type="button"
        disabled={!tappable || dimmed}
        onClick={() => onTap(view)}
        aria-label={`${view.seat.code}: ${caption}${sub ? `, ${sub}` : ''}`}
        className={`relative flex h-[76px] w-full flex-col justify-center gap-[3px] rounded-2xl border-[1.5px] py-0 pl-[11px] pr-2 text-left transition-[transform,box-shadow] duration-150 active:scale-[0.96] disabled:active:scale-100 ${tile[look]} ${
          flash ? 'flash' : ''
        } ${selected ? 'shadow-selected' : ''} ${dimmed ? 'opacity-50' : ''}`}
      >
        <span className="shrink-0 text-[17px] font-extrabold leading-5 tracking-[-0.02em] tabular-nums">{view.seat.code}</span>
        <span className="flex min-w-0 flex-col gap-px pr-3">
          <span className="flex min-w-0 items-center gap-1.5">
            {avatarId && <Avatar userId={avatarId} name={nameOf(avatarId)} size={18} />}
            {star && <StarIcon width={13} height={13} className="shrink-0" strokeWidth={2.2} />}
            <span className={`truncate text-[13px] font-bold leading-[17px] ${captionColor}`}>{caption}</span>
          </span>
          {sub && <span className={`truncate text-[11.5px] font-medium leading-[15px] ${subColor}`}>{sub}</span>}
        </span>
        {showGlyph && (
          <span
            aria-hidden
            className="absolute right-[9px] top-[9px] h-[11px] w-[11px] rounded-full border-[1.5px]"
            style={{ borderColor: glyphBorder, background: `linear-gradient(90deg, ${left} 50%, ${right} 50%)` }}
          />
        )}
      </button>
    </div>
  )
}
