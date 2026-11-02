import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { keys } from '../hooks/useData'
import { useLang } from '../hooks/useLang'
import { api } from '../lib/api'
import { errorMessage } from '../lib/errors'
import { initialsOf } from '../lib/people'
import type { Lang } from '../strings'
import { Button } from './Button'
import { ProgressCard } from './ProgressCard'
import { Sheet } from './Sheet'
import { useToast } from './Toast'

interface ProfileSheetProps {
  open: boolean
  onClose: () => void
  userId: string
  name: string
  email: string
}

const LANGS: Lang[] = ['en', 'cs']

export function ProfileSheet({ open, onClose, userId, name, email }: ProfileSheetProps) {
  const { t, lang, setLang } = useLang()
  const { signOut } = useAuth()
  const [value, setValue] = useState<string | null>(null)
  const toast = useToast()
  const queryClient = useQueryClient()
  const current = value ?? name

  const save = useMutation({
    mutationFn: (displayName: string) => api.updateDisplayName(userId, displayName),
    onSuccess: () => {
      toast(t.profile.saved)
      setValue(null)
      queryClient.invalidateQueries({ queryKey: keys.profiles })
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = current.trim()
    if (trimmed && trimmed !== name) save.mutate(trimmed)
  }

  return (
    <Sheet open={open} title={t.profile.title} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-[18px]">
        <div className="flex items-center gap-3.5">
          <span
            aria-hidden
            className="bg-mine flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-full text-[21px] font-extrabold text-white shadow-brand"
          >
            {initialsOf(name)}
          </span>
          <div className="min-w-0">
            <div className="text-xl font-extrabold leading-[25px]">{name}</div>
            <div className="truncate text-[13.5px] text-muted">{t.profile.signedInAs(email)}</div>
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold">{t.profile.nameLabel}</span>
          <input
            type="text"
            maxLength={80}
            value={current}
            onChange={(e) => setValue(e.target.value)}
            className="min-h-[52px] rounded-[14px] border-[1.5px] border-line-strong bg-white px-3.5 text-base text-ink outline-none focus:border-brand focus:shadow-focus"
          />
          <span className="text-xs text-muted">{t.profile.nameHint}</span>
        </label>
        {value !== null && value.trim() !== name && (
          <Button type="submit" className="min-h-[52px] text-base font-extrabold" disabled={save.isPending || !value.trim()}>
            {t.profile.save}
          </Button>
        )}

        <ProgressCard userId={userId} />

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold">{t.profile.language}</span>
          <div className="flex gap-0.5 rounded-2xl border border-line bg-surface p-1" role="radiogroup" aria-label={t.profile.language}>
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={lang === l}
                onClick={() => setLang(l)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                  lang === l ? 'bg-white text-brand shadow-[0_2px_8px_rgba(26,0,96,0.08)]' : 'text-muted'
                }`}
              >
                {t.profile.languages[l]}
              </button>
            ))}
          </div>
        </div>

        <Button variant="secondary" className="min-h-[52px] text-base" onClick={() => signOut()}>
          {t.auth.signOut}
        </Button>
      </form>
    </Sheet>
  )
}
