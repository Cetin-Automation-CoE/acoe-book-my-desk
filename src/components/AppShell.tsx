import { createContext, useContext, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useBadgeToasts } from '../hooks/useBadgeToasts'
import { useProfiles } from '../hooks/useData'
import { useT } from '../hooks/useLang'
import { initialsOf } from '../lib/people'
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

export function AppShell({ showMySeat }: { showMySeat: boolean }) {
  const t = useT()
  const { user } = useAuth()
  const userId = user!.id
  const location = useLocation()
  const profiles = useProfiles()
  const [profileOpen, setProfileOpen] = useState(false)
  useBadgeToasts(userId)

  // Tab switch: start at the top.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  const name = profiles.data?.get(userId) ?? ''
  const items: { to: string; label: string; icon: typeof DeskIcon }[] = [
    { to: '/', label: t.nav.book, icon: DeskIcon },
    { to: '/bookings', label: t.nav.myBookings, icon: BookmarkIcon },
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
        {items.map(({ to, label, icon: Icon }) => (
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
          </NavLink>
        ))}
      </nav>
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} userId={userId} name={name} email={user?.email ?? ''} />
    </ShellContext.Provider>
  )
}
