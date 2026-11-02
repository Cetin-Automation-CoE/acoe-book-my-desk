import type { SlotChoice } from '../lib/types'

const fills: Record<SlotChoice, string> = {
  AM: 'linear-gradient(90deg, currentColor 50%, transparent 50%)',
  PM: 'linear-gradient(90deg, transparent 50%, currentColor 50%)',
  FULL: 'currentColor',
}

// A circle filled on the left for the morning, on the right for the afternoon, fully for a full day.
// It takes the colour of its text (currentColor).
export function HalfGlyph({ slot, size = 12, className = '' }: { slot: SlotChoice; size?: 11 | 12 | 14 | 16; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-full border-current ${size >= 14 ? 'border-2' : 'border-[1.5px]'} ${className}`}
      style={{ width: size, height: size, background: fills[slot] }}
    />
  )
}
