import { useState, type FormEvent } from 'react'
import { Button } from '../components/Button'
import { useLang } from '../hooks/useLang'
import { supabase } from '../lib/supabase'
import type { Lang, Strings } from '../strings'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CODE_BOXES = 6
const CODE_MAX = 10
const LANGS: Lang[] = ['en', 'cs']

function authErrorMessage(t: Strings, err: { message?: string; status?: number; code?: string }): string {
  if (err.status === 429 || err.code?.includes('rate_limit')) return t.auth.rateLimited
  // The sign-up trigger rejects unknown addresses; Supabase reports that as a generic database error.
  if (/database error/i.test(err.message ?? '')) return t.auth.addressNotAllowed
  if (err.code === 'otp_expired' || /invalid|expired/i.test(err.message ?? '')) return t.auth.invalidCode
  return t.errors.unknown
}

export function SignIn() {
  const { t, lang, setLang } = useLang()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeFocus, setCodeFocus] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault()
    setError(null)
    setNotice(null)
    const trimmed = email.trim().toLowerCase()
    if (!EMAIL_RE.test(trimmed)) return setError(t.auth.invalidEmail)
    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({ email: trimmed, options: { shouldCreateUser: true } })
    setBusy(false)
    if (error) return setError(authErrorMessage(t, error))
    setEmail(trimmed)
    setCode('')
    if (step === 'code') setNotice(t.auth.resent)
    setStep('code')
  }

  const verify = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setError(authErrorMessage(t, error))
  }

  const boxes = Math.max(CODE_BOXES, code.length)
  const inputClass =
    'min-h-14 rounded-[14px] border-[1.5px] border-line-strong bg-white px-4 text-[17px] text-ink outline-none focus:border-brand focus:shadow-focus'

  return (
    <main className="band flex min-h-dvh flex-col">
      <div className="flex min-h-0 flex-1 flex-col px-6 pb-9 pt-[calc(env(safe-area-inset-top)+2rem)] text-white">
        <div className="flex justify-end">
          <div className="flex rounded-xl border border-white/16 bg-white/10 p-[3px]" role="radiogroup" aria-label={t.profile.language}>
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={lang === l}
                onClick={() => setLang(l)}
                className={`h-[30px] min-w-10 rounded-[9px] text-[13px] font-bold ${lang === l ? 'bg-white text-brand' : 'text-white/85'}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-end">
          <img
            src={`${import.meta.env.BASE_URL}icon.svg`}
            alt=""
            className="block h-[76px] w-[76px] rounded-[18px] shadow-icon"
          />
          <h1 className="mt-6 text-[38px] font-extrabold leading-[42px] tracking-[-0.02em]">{t.appName}</h1>
          <p className="mt-2 text-[17px] leading-6 text-white/74">{t.tagline}</p>
        </div>
      </div>

      <div className="shrink-0 rounded-t-[32px] bg-white px-6 pb-[calc(2.875rem+env(safe-area-inset-bottom))] pt-7 shadow-[0_-12px_40px_rgba(10,0,50,0.25)]">
        {step === 'email' ? (
          <form onSubmit={sendCode} className="flex flex-col gap-4">
            <p className="text-[15px] leading-[22px] text-ink-soft">{t.auth.intro}</p>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold text-ink">{t.auth.emailLabel}</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.auth.emailPlaceholder}
                className={`${inputClass} ${error ? 'border-accent' : ''}`}
              />
            </label>
            {error && <p className="text-sm font-semibold leading-5 text-accent">{error}</p>}
            <Button type="submit" disabled={busy}>
              {busy ? t.auth.sending : t.auth.sendCode}
            </Button>
          </form>
        ) : (
          <form onSubmit={verify} className="flex flex-col gap-4">
            <p className="text-[15px] leading-[22px] text-ink-soft">{notice ?? t.auth.codeSentTo(email)}</p>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold">{t.auth.codeLabel}</span>
              <div className="relative grid gap-2" style={{ gridTemplateColumns: `repeat(${boxes}, minmax(0, 1fr))` }}>
                {Array.from({ length: boxes }, (_, i) => {
                  const ch = code[i] ?? ''
                  const active = codeFocus && i === Math.min(code.length, boxes - 1)
                  const box = error
                    ? 'border-accent'
                    : active
                      ? 'border-brand shadow-focus'
                      : ch
                        ? 'border-brand/35 bg-brand/4'
                        : 'border-line-strong'
                  return (
                    <div
                      key={i}
                      aria-hidden
                      className={`flex h-[62px] items-center justify-center rounded-[14px] border-[1.5px] text-[28px] font-extrabold tabular-nums text-brand transition-[box-shadow,border-color,background] duration-150 ${box}`}
                    >
                      {ch}
                    </div>
                  )
                })}
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6,10}"
                  maxLength={CODE_MAX}
                  autoFocus
                  required
                  aria-label={t.auth.codeLabel}
                  value={code}
                  onFocus={() => setCodeFocus(true)}
                  onBlur={() => setCodeFocus(false)}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_MAX))}
                  className="absolute inset-0 h-full w-full cursor-text opacity-0"
                />
              </div>
            </div>
            {error && <p className="text-sm font-semibold leading-5 text-accent">{error}</p>}
            <Button type="submit" disabled={busy || code.length < CODE_BOXES}>
              {busy ? t.auth.verifying : t.auth.verify}
            </Button>
            <div className="flex justify-between gap-2">
              <button type="button" onClick={() => sendCode()} disabled={busy} className="min-h-10 rounded-[10px] px-2 text-sm font-bold text-brand">
                {t.auth.resend}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setError(null)
                  setNotice(null)
                }}
                disabled={busy}
                className="min-h-10 rounded-[10px] px-2 text-sm font-bold text-brand"
              >
                {t.auth.changeEmail}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
