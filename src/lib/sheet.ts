// What happens when the finger lets go of a bottom sheet that was dragged down.
// Pure, so the gesture itself (in Sheet.tsx) stays free of thresholds.

export interface DragRelease {
  // How far the sheet was pulled down, in px (negative when pushed up).
  offset: number
  // Downward speed at release, in px/ms.
  velocity: number
  // The sheet's height, in px.
  height: number
}

const MIN_DISTANCE = 120
const FLICK_SPEED = 0.6
const FLICK_MIN_OFFSET = 20

// Close after a pull of 120 px (or a third of a short sheet), or on a quick downward flick that
// moved more than a touch's worth; otherwise the sheet snaps back.
export function dragOutcome({ offset, velocity, height }: DragRelease): 'close' | 'snap' {
  if (offset <= 0) return 'snap'
  const distance = Math.min(MIN_DISTANCE, height / 3)
  if (offset >= distance) return 'close'
  if (velocity >= FLICK_SPEED && offset >= FLICK_MIN_OFFSET) return 'close'
  return 'snap'
}
