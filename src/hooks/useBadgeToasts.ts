import { useEffect, useRef } from 'react'
import { useToast } from '../components/Toast'
import type { BadgeKey } from '../lib/progress'
import { strings } from '../strings'
import { useBadges } from './useData'

// Announces a badge the moment it appears in the person's list (after a check-in anywhere in the app).
// The first load only records what is already earned.
export function useBadgeToasts(userId: string) {
  const badges = useBadges(userId)
  const toast = useToast()
  const seen = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (!badges.data) return
    const keys = badges.data.map((b) => b.badge)
    if (seen.current === null) {
      seen.current = new Set(keys)
      return
    }
    for (const key of keys) {
      if (seen.current.has(key)) continue
      seen.current.add(key)
      const badge = strings.badges[key as BadgeKey]
      if (badge) toast(strings.progress.newBadge(badge.name))
    }
  }, [badges.data, toast])
}
