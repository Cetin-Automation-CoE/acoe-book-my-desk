import { dayLabel } from '../lib/dates'
import type { Nudge } from '../lib/progress'
import { strings } from '../strings'

interface TeamDayNudgeProps {
  nudge: Nudge
  today: string
  onShow: (date: string) => void
}

export function TeamDayNudge({ nudge, today, onShow }: TeamDayNudgeProps) {
  const label = dayLabel(nudge.date, today)
  const named = label.relative ?? `${label.weekday} ${label.day} ${label.month}`
  const when = label.relative ? label.relative.toLowerCase() : `on ${label.weekday} ${label.day} ${label.month}`

  switch (nudge.kind) {
    case 'team_day':
      return (
        <p className="mb-3 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white" aria-live="polite">
          {strings.teamDay.here(nudge.others)}
        </p>
      )
    case 'join':
      return (
        <p className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm text-neutral-700">
          <span>{strings.teamDay.join(named, nudge.others)}</span>
          <button
            type="button"
            onClick={() => onShow(nudge.date)}
            className="min-h-9 shrink-0 rounded-lg px-2 font-semibold text-brand hover:bg-surface"
          >
            {strings.teamDay.show}
          </button>
        </p>
      )
    case 'some':
      return <p className="mb-3 text-sm text-muted">{strings.teamDay.some(nudge.others, when)}</p>
  }
}
