import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ErrorCard } from './components/States'
import { ToastProvider } from './components/Toast'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { useSeats, useSettings } from './hooks/useData'
import { LangProvider, useT } from './hooks/useLang'
import { RealtimeProvider } from './hooks/useRealtime'
import { env } from './lib/env'
import { DayView } from './pages/DayView'
import { MyBookings } from './pages/MyBookings'
import { MySeat } from './pages/MySeat'
import { SignIn } from './pages/SignIn'
import { WhoIsIn } from './pages/WhoIsIn'
import { strings } from './strings'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000, refetchOnWindowFocus: true } },
})

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center p-6 text-center">{children}</main>
}

function SignedInApp() {
  const t = useT()
  const { user } = useAuth()
  const settings = useSettings()
  const seats = useSeats()

  if (settings.error) {
    return (
      <main className="band flex min-h-dvh items-end">
        <div className="w-full rounded-t-[28px] bg-surface p-4 pb-10">
          <div className="mx-auto max-w-md">
            <ErrorCard error={settings.error} onRetry={() => settings.refetch()} />
          </div>
        </div>
      </main>
    )
  }
  if (!settings.data) {
    return (
      <main className="band min-h-dvh">
        <p className="sr-only">{t.loading}</p>
      </main>
    )
  }

  const ownsSeat = (seats.data ?? []).some((s) => s.owner_id === user?.id && s.active)

  return (
    <RealtimeProvider>
      <Routes>
        <Route element={<AppShell showMySeat={ownsSeat} />}>
          <Route index element={<DayView settings={settings.data} />} />
          <Route path="bookings" element={<MyBookings settings={settings.data} />} />
          <Route path="who" element={<WhoIsIn settings={settings.data} />} />
          <Route path="seat" element={<MySeat settings={settings.data} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </RealtimeProvider>
  )
}

function Gate() {
  const { session, loading } = useAuth()
  if (loading) return <main className="band min-h-dvh" />
  return session ? <SignedInApp /> : <SignIn />
}

export default function App() {
  if (!env.isConfigured) {
    return (
      <Centered>
        <p className="rounded-lg bg-white p-4 text-sm text-accent shadow-sm">{strings.config.missing}</p>
      </Centered>
    )
  }
  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <AuthProvider>
          <ToastProvider>
            <HashRouter>
              <Gate />
            </HashRouter>
          </ToastProvider>
        </AuthProvider>
      </LangProvider>
    </QueryClientProvider>
  )
}
