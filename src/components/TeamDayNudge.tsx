import { useT } from '../hooks/useLang'
import { dayLabel } from '../lib/dates'
import type { Nudge } from '../lib/progress'

interface TeamDayNudgeProps {
  nudge: Nudge
  today: string
  onShow: (date: string) => void
}

export function TeamDayNudge({ nudge, today, onShow }: TeamDayNudgeProps) {
  const t = useT()
  const label = dayLabel(nudge.date, today)
  const named = label.relative ?? `${label.weekday} ${label.day} ${label.month}`
  const when = label.relative ? label.relative.toLowerCase() : `${label.weekday} ${label.day} ${label.month}`

  switch (nudge.kind) {
    case 'team_day':
      return (
        <p className="mb-3.5 rounded-2xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-brand" aria-live="polite">
          {t.teamDay.here(nudge.others)}
        </p>
      )
    case 'join':
      return (
        <p className="mb-3.5 flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-ink-soft shadow-card">
          <span>{t.teamDay.join(named, nudge.others)}</span>
          <button type="button" onClick={() => onShow(nudge.date)} className="min-h-9 shrink-0 rounded-xl px-2 font-extrabold text-brand">
            {t.teamDay.show}
          </button>
        </p>
      )
    case 'some':
      return <p className="mb-3.5 px-1 text-[13px] text-muted">{t.teamDay.some(nudge.others, when)}</p>
  }
}
