import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { keys, useNotifyPrefs } from '../hooks/useData'
import { useT } from '../hooks/useLang'
import { api } from '../lib/api'
import { env } from '../lib/env'
import { errorMessage } from '../lib/errors'
import { currentSubscription, needsHomeScreen, permissionState, pushSupported, subscribePush, unsubscribePush } from '../lib/push'
import type { NotifyPrefs } from '../lib/types'
import { useToast } from './Toast'

function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-[30px] w-[50px] shrink-0 rounded-full transition ${checked ? 'bg-brand' : 'bg-line'} disabled:opacity-50`}
    >
      <span
        aria-hidden
        className={`absolute top-[3px] h-6 w-6 rounded-full bg-white shadow-[0_1px_3px_rgba(26,0,96,.25)] transition-[left] ${
          checked ? 'left-[23px]' : 'left-[3px]'
        }`}
      />
    </button>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 py-1.5">
      <span className="flex min-w-0 flex-col">
        <span className="text-[15px] font-bold leading-5">{label}</span>
        {hint && <span className="text-xs leading-4 text-muted">{hint}</span>}
      </span>
      {children}
    </div>
  )
}

// The "Notifications" block of the profile sheet: one switch for this device, then one per kind.
export function Notifications({ userId }: { userId: string }) {
  const t = useT()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [subscribed, setSubscribed] = useState<boolean | null>(null)
  const prefs = useNotifyPrefs(userId, subscribed === true)
  const configured = Boolean(env.vapidPublicKey)

  useEffect(() => {
    if (!configured || !pushSupported()) {
      setSubscribed(false)
      return
    }
    let cancelled = false
    currentSubscription()
      .then((sub) => (sub ? api.hasPushSubscription(sub.endpoint) : false))
      .then((on) => {
        if (!cancelled) setSubscribed(on)
      })
      .catch(() => {
        if (!cancelled) setSubscribed(false)
      })
    return () => {
      cancelled = true
    }
  }, [configured])

  const toggleDevice = useMutation({
    mutationFn: async (on: boolean) => {
      if (on) {
        const sub = await subscribePush(env.vapidPublicKey)
        await api.savePushSubscription(userId, sub)
      } else {
        const endpoint = await unsubscribePush()
        if (endpoint) await api.removePushSubscription(endpoint)
      }
      return on
    },
    onSuccess: (on) => {
      setSubscribed(on)
      toast(on ? t.notifications.enabled : t.notifications.disabled)
      queryClient.invalidateQueries({ queryKey: keys.notifyPrefs(userId) })
    },
    onError: (err) =>
      toast(err instanceof Error && err.message === 'push_denied' ? t.notifications.denied : errorMessage(err), 'error'),
  })

  const setPref = useMutation({
    mutationFn: (patch: Partial<NotifyPrefs>) => api.updateNotifyPrefs(userId, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.notifyPrefs(userId) }),
    onError: (err) => toast(errorMessage(err), 'error'),
  })

  if (!configured) return null

  let note: string | null = null
  if (!pushSupported()) note = t.notifications.unsupported
  else if (needsHomeScreen()) note = t.notifications.install
  else if (permissionState() === 'denied') note = t.notifications.denied

  const kinds: { key: keyof NotifyPrefs; label: string; hint: string }[] = [
    { key: 'notify_tomorrow', label: t.notifications.tomorrow, hint: t.notifications.tomorrowHint },
    { key: 'notify_monday', label: t.notifications.monday, hint: t.notifications.mondayHint },
    { key: 'notify_team_day', label: t.notifications.teamDay, hint: t.notifications.teamDayHint },
  ]

  return (
    <section className="flex flex-col gap-1.5" aria-labelledby="notifications-heading">
      <h2 id="notifications-heading" className="text-[13px] font-bold">
        {t.notifications.title}
      </h2>
      {note ? (
        <p className="rounded-xl bg-surface px-3 py-2.5 text-[13px] leading-[18px] text-muted">{note}</p>
      ) : (
        <div className="rounded-2xl bg-surface px-3.5">
          <Row label={t.notifications.device} hint={t.notifications.deviceHint}>
            <Switch
              label={t.notifications.device}
              checked={subscribed === true}
              disabled={subscribed === null || toggleDevice.isPending}
              onChange={(on) => toggleDevice.mutate(on)}
            />
          </Row>
          {subscribed && prefs.data && (
            <div className="border-t border-rule">
              {kinds.map((k) => (
                <Row key={k.key} label={k.label} hint={k.hint}>
                  <Switch
                    label={k.label}
                    checked={prefs.data[k.key]}
                    disabled={setPref.isPending}
                    onChange={(on) => setPref.mutate({ [k.key]: on })}
                  />
                </Row>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
