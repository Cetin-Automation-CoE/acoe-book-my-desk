import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useBadgeToasts } from '../hooks/useBadgeToasts'
import { useMyBookings, useNow, useProfiles, useSeats } from '../hooks/useData'
import { useT } from '../hooks/useLang'
import { checkInState, todayIn } from '../lib/dates'
import { initialsOf } from '../lib/people'
import type { Settings } from '../lib/types'
import { BookmarkIcon, DeskIcon, PeopleIcon, StarIcon } from './icons'
import { ProfileSheet } from './ProfileSheet'

interface ShellApi {
  openProfile: () => void
  initials: string
  name: string
}

const ShellContext = createContext<ShellApi>({ openProfile: () => {}, initials: '', name: '' })

export function useShell() {
  return useContext(ShellContext)
}

export function AppShell({ showMySeat, settings }: { showMySeat: boolean; settings: Settings }) {
  const t = useT()
  const { user } = useAuth()
  const userId = user!.id
  const location = useLocation()
  const now = useNow()
  const today = todayIn(settings.timezone, now)
  const profiles = useProfiles()
  const seats = useSeats()
  const myToday = useMyBookings(userId, today)
  const [profileOpen, setProfileOpen] = useState(false)
  useBadgeToasts(userId)

  // Tab switch: start at the top.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  const name = profiles.data?.get(userId) ?? ''
  const checkInOpen = (myToday.data ?? []).some(
    (b) =>
      b.date === today &&
      checkInState(b, settings, seats.data?.find((s) => s.id === b.seat_id)?.owner_id === userId, now) === 'open',
  )

  const items: { to: string; label: string; icon: typeof DeskIcon; dot?: boolean }[] = [
    { to: '/', label: t.nav.book, icon: DeskIcon },
    { to: '/bookings', label: t.nav.myBookings, icon: BookmarkIcon, dot: checkInOpen },
    { to: '/who', label: t.nav.whoIsIn, icon: PeopleIcon },
  ]
  if (showMySeat) items.push({ to: '/seat', label: t.nav.mySeat, icon: StarIcon })

  return (
    <ShellContext.Provider value={{ openProfile: () => setProfileOpen(true), initials: initialsOf(name), name }}>
      <div className="mx-auto min-h-dvh max-w-md">
        <Outlet />
      </div>
      <nav
        className="fixed inset-x-3.5 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md gap-0.5 rounded-[26px] border border-white/70 bg-white/86 p-1.5 shadow-nav backdrop-blur-[20px] backdrop-saturate-[1.8]"
        aria-label="Main"
      >
        {items.map(({ to, label, icon: Icon, dot }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center gap-0.5 rounded-[20px] px-0.5 pb-1.5 pt-[7px] text-[11px] font-bold leading-[14px] transition ${
                isActive ? 'bg-brand/9 text-brand' : 'text-muted'
              }`
            }
          >
            <Icon />
            <span className="whitespace-nowrap">{label}</span>
            {dot && (
              <span
                aria-hidden
                className="absolute left-[calc(50%+8px)] top-1 h-[9px] w-[9px] rounded-full border-2 border-white bg-accent box-content"
              />
            )}
          </NavLink>
        ))}
      </nav>
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} userId={userId} name={name} email={user?.email ?? ''} />
    </ShellContext.Provider>
  )
}

export function ShellProviders({ children }: { children: ReactNode }) {
  return children
}
