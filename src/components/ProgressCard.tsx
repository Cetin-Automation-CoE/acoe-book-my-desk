import { useBadges, useStats } from '../hooks/useData'
import { BADGES } from '../lib/progress'
import { strings } from '../strings'
import { CheckIcon } from './icons'

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <li className="rounded-lg bg-surface px-3 py-2">
      <span className="block text-2xl font-bold tabular-nums text-brand">{value}</span>
      <span className="block text-xs leading-snug text-muted">{label}</span>
    </li>
  )
}

export function ProgressCard({ userId }: { userId: string }) {
  const stats = useStats(userId)
  const badges = useBadges(userId)

  // Progress is a bonus: if it cannot load, the bookings list must not suffer for it.
  if (stats.error || badges.error) return null
  if (stats.isPending || badges.isPending) return null

  const streak = stats.data?.current_streak ?? 0
  const best = stats.data?.best_streak ?? 0
  const days = stats.data?.office_days ?? 0
  const earned = new Map(badges.data.map((b) => [b.badge, b.earned_at]))

  return (
    <section className="mb-5 rounded-xl bg-white p-4" aria-labelledby="progress-heading">
      <h2 id="progress-heading" className="font-semibold">
        {strings.progress.title}
      </h2>
      <ul className="mt-3 grid grid-cols-3 gap-2">
        <Stat value={streak} label={strings.progress.streak} />
        <Stat value={best} label={strings.progress.best} />
        <Stat value={days} label={strings.progress.days(days)} />
      </ul>
      {days === 0 && <p className="mt-3 text-sm text-muted">{strings.progress.start}</p>}

      <details className="group mt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-brand [&::-webkit-details-marker]:hidden">
          <span>{strings.progress.badges(earned.size, BADGES.length)}</span>
          <span aria-hidden className="text-muted transition group-open:rotate-180">
            ⌄
          </span>
        </summary>
        <ul className="mt-2 flex flex-col gap-1.5">
          {BADGES.map((key) => {
            const at = earned.get(key)
            const badge = strings.badges[key]
            return (
              <li
                key={key}
                className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${
                  at ? 'bg-brand/10 text-brand-deep' : 'bg-surface text-muted'
                }`}
              >
                <span>
                  <span className="block text-sm font-semibold">{badge.name}</span>
                  <span className="block text-xs">{badge.rule}</span>
                </span>
                {at && <CheckIcon width={18} height={18} className="shrink-0 text-brand" />}
              </li>
            )
          })}
        </ul>
      </details>
    </section>
  )
}
