import { useBadges, useStats } from '../hooks/useData'
import { useT } from '../hooks/useLang'
import { BADGES } from '../lib/progress'
import { CheckIcon } from './icons'

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <li className="rounded-2xl bg-surface px-3 py-2.5">
      <span className="block text-[26px] font-extrabold leading-7 tabular-nums tracking-[-0.02em] text-brand">{value}</span>
      <span className="block text-xs leading-snug text-muted">{label}</span>
    </li>
  )
}

// Week streak, best streak, office days and the badge list. Lives in the Profile sheet.
export function ProgressCard({ userId }: { userId: string }) {
  const t = useT()
  const stats = useStats(userId)
  const badges = useBadges(userId)

  // Progress is a bonus: if it cannot load, the rest of the sheet must not suffer for it.
  if (stats.error || badges.error) return null
  if (stats.isPending || badges.isPending) return null

  const streak = stats.data?.current_streak ?? 0
  const best = stats.data?.best_streak ?? 0
  const days = stats.data?.office_days ?? 0
  const earned = new Map(badges.data.map((b) => [b.badge, b.earned_at]))

  return (
    <section aria-labelledby="progress-heading">
      <h2 id="progress-heading" className="text-[13px] font-bold">
        {t.progress.title}
      </h2>
      <ul className="mt-1.5 grid grid-cols-3 gap-2">
        <Stat value={streak} label={t.progress.streak} />
        <Stat value={best} label={t.progress.best} />
        <Stat value={days} label={t.progress.days(days)} />
      </ul>
      {days === 0 && <p className="mt-2 text-[13px] leading-[18px] text-muted">{t.progress.start}</p>}

      <details className="group mt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-brand [&::-webkit-details-marker]:hidden">
          <span>{t.progress.badges(earned.size, BADGES.length)}</span>
          <span aria-hidden className="text-muted transition group-open:rotate-180">
            ⌄
          </span>
        </summary>
        <ul className="mt-2 flex flex-col gap-1.5">
          {BADGES.map((key) => {
            const at = earned.get(key)
            const badge = t.badges[key]
            return (
              <li
                key={key}
                className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 ${
                  at ? 'bg-brand/10 text-brand-deep' : 'bg-surface text-muted'
                }`}
              >
                <span>
                  <span className="block text-sm font-bold">{badge.name}</span>
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
