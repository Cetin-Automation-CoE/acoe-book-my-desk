import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ToastProvider } from './components/Toast'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { useSeats, useSettings } from './hooks/useData'
import { env } from './lib/env'
import { errorMessage } from './lib/errors'
import { DayView } from './pages/DayView'
import { MyBookings } from './pages/MyBookings'
import { SignIn } from './pages/SignIn'
import { strings } from './strings'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000, refetchOnWindowFocus: true } },
})

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center p-6 text-center">{children}</main>
}

function SignedInApp() {
  const { user } = useAuth()
  const settings = useSettings()
  const seats = useSeats()

  if (settings.error) return <Centered><p className="text-accent">{errorMessage(settings.error)}</p></Centered>
  if (!settings.data) return <Centered><p className="text-muted">{strings.loading}</p></Centered>

  const ownsSeat = (seats.data ?? []).some((s) => s.owner_id === user?.id && s.active)

  return (
    <Routes>
      <Route element={<AppShell showMySeat={ownsSeat} />}>
        <Route index element={<DayView settings={settings.data} />} />
        <Route path="bookings" element={<MyBookings settings={settings.data} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function Gate() {
  const { session, loading } = useAuth()
  if (loading) return <Centered><p className="text-muted">{strings.loading}</p></Centered>
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
      <AuthProvider>
        <ToastProvider>
          <HashRouter>
            <Gate />
          </HashRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
