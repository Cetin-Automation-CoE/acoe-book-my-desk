import { useEffect } from 'react'
import { useToast } from '../components/Toast'
import { celebrateBadge } from '../lib/delight'
import type { BadgeKey } from '../lib/progress'
import { useData } from './useData'
import { useT } from './useLang'

// Announces badges that appeared since this device last saw the list — right after a same-day
// booking, or on the next open when the counting job awarded one in between. The very first load
// on a device only records what is already earned.
export function useBadgeToasts(userId: string) {
  const badges = useData.badges(userId)
  const toast = useToast()
  const t = useT()
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
      let fresh = 0
      for (const key of keys) {
        if (seen.includes(key)) continue
        const badge = t.badges[key as BadgeKey]
        if (badge) {
          toast(t.progress.newBadge(badge.name))
          fresh += 1
        }
      }
      if (fresh > 0) celebrateBadge()
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(keys))
    } catch {
      // Private mode or blocked storage: badges still show in the profile sheet.
    }
  }, [badges.data, toast, storageKey, t])
}
