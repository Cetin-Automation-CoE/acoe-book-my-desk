import { useEffect } from 'react'
import { useToast } from '../components/Toast'
import type { BadgeKey } from '../lib/progress'
import { strings } from '../strings'
import { useBadges } from './useData'

// Announces badges that appeared since this device last saw the list — right after a same-day
// booking, or on the next open when the counting job awarded one in between. The very first load
// on a device only records what is already earned.
export function useBadgeToasts(userId: string) {
  const badges = useBadges(userId)
  const toast = useToast()
  const storageKey = `bmd:badges-seen:${userId}`

  useEffect(() => {
    if (!badges.data) return
    const keys = badges.data.map((b) => b.badge)
    let seen: string[] | null = null
    try {
      const raw = window.localStorage.getItem(storageKey)
      seen = raw ? (JSON.parse(raw) as string[]) : null
    } catch {
      seen = null
    }
    if (seen) {
      for (const key of keys) {
        if (seen.includes(key)) continue
        const badge = strings.badges[key as BadgeKey]
        if (badge) toast(strings.progress.newBadge(badge.name))
      }
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(keys))
    } catch {
      // Private mode or blocked storage: badges still show on My bookings.
    }
  }, [badges.data, toast, storageKey])
}
