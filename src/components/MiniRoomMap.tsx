import { roomBlocks } from '../lib/layout'
import type { SeatView } from '../lib/seatState'
import { PAIRS_PER_BLOCK } from './SeatGrid'

// The three table blocks side by side, one cell per seat, with the seat in question highlighted.
export function MiniRoomMap({ views, seatId }: { views: SeatView[]; seatId: string }) {
  const cell = (v: SeatView) => {
    if (v.seat.id === seatId) return { background: '#300091', boxShadow: '0 0 0 2px rgba(48,0,145,.25)' }
    switch (v.kind) {
      case 'mine':
        return { background: '#41b6e6' }
      case 'taken':
        return { background: '#d7dae1' }
      case 'held':
        return { background: 'rgba(167,164,224,.7)' }
      default:
        return { background: '#fff', boxShadow: 'inset 0 0 0 1px #d7dae1' }
    }
  }
  return (
    <div aria-hidden className="flex shrink-0 gap-1.5 rounded-[14px] bg-surface p-2">
      {roomBlocks(views, PAIRS_PER_BLOCK).map((block, b) => (
        <div key={b} className="flex flex-col gap-[3px]">
          {block.map((pair, p) => (
            <div key={p} className="flex gap-0.5">
              {pair.map((v) => (
                <span key={v.seat.id} className="h-3 w-[9px] rounded-[3px]" style={cell(v)} />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
