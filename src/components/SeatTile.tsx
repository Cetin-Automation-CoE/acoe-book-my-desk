import { useT } from '../hooks/useLang'
import { shortName } from '../lib/people'
import type { SeatKind, SeatView } from '../lib/seatState'
import type { PeopleMap } from '../lib/types'
import { Avatar } from './Avatar'
import { HeartIcon, StarIcon } from './icons'

export interface SeatTileProps {
  view: SeatView
  people: PeopleMap
  userId: string
  myName: string
  // I already have a seat that day: free seats are shown but not tappable.
  blocked: boolean
  flash: boolean
  selected: boolean
  // My favourite seat: a small heart in the corner.
  favourite: boolean
  // "Surprise me" is passing over this seat.
  spotlight: boolean
  index: number
  onTap: (view: SeatView) => void
}

const tile: Record<SeatKind, string> = {
  free: 'bg-white border-brand/16 text-brand',
  mine: 'bg-mine border-brand text-white shadow-mine',
  taken: 'bg-taken border-taken text-taken-ink',
  held: 'bg-lilac-soft/32 border-transparent text-lilac',
  inactive: 'bg-transparent border-dashed border-line-strong text-[#b4b6c6]',
}

// One seat in the grid: big desk number and who has it for the day.
export function SeatTile(props: SeatTileProps) {
  const { view, people, userId, myName, blocked, flash, selected, favourite, spotlight, index, onTap } = props
  const t = useT()
  const nameOf = (id: string) => (id === userId ? myName : (people.get(id)?.name ?? '…'))

  const look = view.kind
  const tappable = (look === 'free' && !blocked) || look === 'mine'
  const dimmed = look === 'free' && blocked

  // Caption and sub line
  let caption = ''
  let sub = ''
  let avatarId: string | null = null
  let star = false

  switch (look) {
    case 'free':
      caption = t.seats.free
      break
    case 'mine':
      caption = t.you
      break
    case 'taken': {
      const distinct = [...new Set(view.takenBy)]
      if (distinct.length === 1) {
        avatarId = distinct[0]
        caption = shortName(nameOf(distinct[0]))
      } else {
        caption = t.seats.taken
        sub = distinct.map((id) => shortName(nameOf(id))).join(' · ')
      }
      break
    }
    case 'held': {
      star = true
      caption = t.seats.held
      const ownerName = (view.seat.owner_id && people.get(view.seat.owner_id)?.name) || view.seat.owner_name
      sub = ownerName ? shortName(ownerName) : ''
      break
    }
    case 'inactive':
      caption = t.seats.inactive
      break
  }

  const captionColor =
    look === 'taken' ? 'text-ink-soft' : look === 'held' ? 'text-brand-deep' : look === 'mine' ? 'text-white' : ''
  const subColor = look === 'held' ? 'text-brand-deep/70' : look === 'mine' ? 'text-white/80' : look === 'taken' ? 'text-ink-soft/80' : 'text-muted'

  return (
    <div className="enter" style={{ '--i': index } as React.CSSProperties}>
      <button
        type="button"
        disabled={!tappable}
        onClick={() => onTap(view)}
        aria-label={`${view.seat.code}: ${caption}${sub ? `, ${sub}` : ''}${favourite ? `, ${t.favourite.is}` : ''}`}
        className={`relative flex h-[76px] w-full flex-col justify-center gap-[3px] rounded-2xl border-[1.5px] py-0 pl-[11px] pr-2 text-left transition-[transform,box-shadow] duration-150 active:scale-[0.96] disabled:active:scale-100 ${tile[look]} ${
          flash ? 'flash' : ''
        } ${selected ? 'shadow-selected' : ''} ${spotlight ? 'z-10 scale-[1.06] ring-[3px] ring-sky' : ''} ${dimmed ? 'opacity-50' : ''}`}
      >
        {favourite && (
          <HeartIcon
            filled
            width={13}
            height={13}
            className={`absolute right-2 top-2 ${look === 'mine' ? 'text-white/85' : look === 'free' ? 'text-accent' : 'text-taken-ink'}`}
          />
        )}
        <span className="shrink-0 text-[17px] font-extrabold leading-5 tracking-[-0.02em] tabular-nums">{view.seat.code}</span>
        <span className="flex min-w-0 flex-col gap-px pr-3">
          <span className="flex min-w-0 items-center gap-1.5">
            {avatarId && <Avatar userId={avatarId} name={nameOf(avatarId)} src={people.get(avatarId)?.avatar} size={18} />}
            {star && <StarIcon width={13} height={13} className="shrink-0" strokeWidth={2.2} />}
            <span className={`truncate text-[13px] font-bold leading-[17px] ${captionColor}`}>{caption}</span>
          </span>
          {sub && <span className={`truncate text-[11.5px] font-medium leading-[15px] ${subColor}`}>{sub}</span>}
        </span>
      </button>
    </div>
  )
}
