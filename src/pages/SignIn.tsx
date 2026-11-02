import { useState, type FormEvent } from 'react'
import { Button } from '../components/Button'
import { supabase } from '../lib/supabase'
import { strings } from '../strings'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function authErrorMessage(err: { message?: string; status?: number; code?: string }): string {
  if (err.status === 429 || err.code?.includes('rate_limit')) return strings.auth.rateLimited
  // The sign-up trigger rejects unknown addresses; Supabase reports that as a generic database error.
  if (/database error/i.test(err.message ?? '')) return strings.auth.addressNotAllowed
  if (err.code === 'otp_expired' || /invalid|expired/i.test(err.message ?? '')) return strings.auth.invalidCode
  return strings.errors.unknown
}

export function SignIn() {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendCode = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmed = email.trim().toLowerCase()
    if (!EMAIL_RE.test(trimmed)) return setError(strings.auth.invalidEmail)
    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({ email: trimmed, options: { shouldCreateUser: true } })
    setBusy(false)
    if (error) return setError(authErrorMessage(error))
    setEmail(trimmed)
    setCode('')
    setStep('code')
  }

  const verify = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setError(authErrorMessage(error))
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-3xl font-bold text-brand">{strings.appName}</h1>
      <p className="mt-1 text-muted">{strings.tagline}</p>

      {step === 'email' ? (
        <form onSubmit={sendCode} className="mt-10 flex flex-col gap-4">
          <p className="text-neutral-800">{strings.auth.intro}</p>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">{strings.auth.emailLabel}</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={strings.auth.emailPlaceholder}
              className="min-h-12 rounded-lg border border-line-strong bg-white px-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>
          {error && <p className="text-sm font-semibold text-accent">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? strings.auth.sending : strings.auth.sendCode}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-10 flex flex-col gap-4">
          <p className="text-neutral-800">{strings.auth.codeSentTo(email)}</p>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">{strings.auth.codeLabel}</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              autoFocus
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="min-h-14 rounded-lg border border-line-strong bg-white px-3 text-center text-2xl font-semibold tracking-[0.4em] outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>
          {error && <p className="text-sm font-semibold text-accent">{error}</p>}
          <Button type="submit" disabled={busy || code.length !== 6}>
            {busy ? strings.auth.verifying : strings.auth.verify}
          </Button>
          <div className="flex justify-between text-sm">
            <Button variant="ghost" className="min-h-10 px-2" onClick={sendCode} disabled={busy}>
              {strings.auth.resend}
            </Button>
            <Button variant="ghost" className="min-h-10 px-2" onClick={() => setStep('email')} disabled={busy}>
              {strings.auth.changeEmail}
            </Button>
          </div>
        </form>
      )}
    </main>
  )
}
