import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { keys } from '../hooks/useData'
import { useLang } from '../hooks/useLang'
import { api } from '../lib/api'
import { errorMessage } from '../lib/errors'
import { squareJpeg } from '../lib/image'
import { initialsOf } from '../lib/people'
import type { Lang } from '../strings'
import { Button } from './Button'
import { Notifications } from './Notifications'
import { ProgressCard } from './ProgressCard'
import { Sheet } from './Sheet'
import { useToast } from './Toast'

interface ProfileSheetProps {
  open: boolean
  onClose: () => void
  userId: string
  name: string
  avatar: string | null
  email: string
}

const LANGS: Lang[] = ['en', 'cs']

export function ProfileSheet({ open, onClose, userId, name, avatar, email }: ProfileSheetProps) {
  const { t, lang, setLang } = useLang()
  const { signOut } = useAuth()
  const [value, setValue] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const queryClient = useQueryClient()
  const current = value ?? name
  const refreshProfiles = () => queryClient.invalidateQueries({ queryKey: keys.profiles })

  const save = useMutation({
    mutationFn: (displayName: string) => api.updateDisplayName(userId, displayName),
    onSuccess: () => {
      toast(t.profile.saved)
      setValue(null)
      refreshProfiles()
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  })

  const upload = useMutation({
    mutationFn: async (file: File) => api.uploadAvatar(userId, await squareJpeg(file)),
    onSuccess: () => {
      toast(t.profile.photoSaved)
      refreshProfiles()
    },
    onError: (err) => toast(err instanceof Error && err.message === 'photo_failed' ? t.profile.photoFailed : errorMessage(err), 'error'),
  })

  const remove = useMutation({
    mutationFn: () => api.removeAvatar(userId),
    onSuccess: () => {
      toast(t.profile.photoRemoved)
      refreshProfiles()
    },
    onError: (err) => toast(errorMessage(err), 'error'),
  })

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) upload.mutate(file)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = current.trim()
    if (trimmed && trimmed !== name) save.mutate(trimmed)
  }

  const photoBusy = upload.isPending || remove.isPending

  return (
    <Sheet open={open} title={t.profile.title} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-[18px]">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={photoBusy}
            aria-label={avatar ? t.profile.changePhoto : t.profile.addPhoto}
            className="bg-mine flex h-[62px] w-[62px] shrink-0 items-center justify-center overflow-hidden rounded-full text-[21px] font-extrabold text-white shadow-brand transition active:scale-95"
          >
            {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : initialsOf(name)}
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xl font-extrabold leading-[25px]">{name}</div>
            <div className="truncate text-[13.5px] text-muted">{t.profile.signedInAs(email)}</div>
            <div className="mt-1.5 flex gap-3 text-[13px] font-bold text-brand">
              <button type="button" onClick={() => fileInput.current?.click()} disabled={photoBusy} className="min-h-6">
                {photoBusy ? t.profile.uploading : avatar ? t.profile.changePhoto : t.profile.addPhoto}
              </button>
              {avatar && !photoBusy && (
                <button type="button" onClick={() => remove.mutate()} className="min-h-6 text-muted">
                  {t.profile.removePhoto}
                </button>
              )}
            </div>
          </div>
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onFile} />
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

        <Notifications userId={userId} />

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
