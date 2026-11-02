import { NavLink, Outlet } from 'react-router-dom'
import { useRealtime } from '../hooks/useRealtime'
import { strings } from '../strings'
import { BookmarkIcon, DeskIcon, PeopleIcon, StarIcon } from './icons'

export interface NavItem {
  to: string
  label: string
  icon: typeof DeskIcon
}

const items: NavItem[] = [
  { to: '/', label: strings.nav.book, icon: DeskIcon },
  { to: '/bookings', label: strings.nav.myBookings, icon: BookmarkIcon },
  { to: '/who', label: strings.nav.whoIsIn, icon: PeopleIcon },
]

export function AppShell({ showMySeat }: { showMySeat: boolean }) {
  useRealtime()
  const nav = showMySeat ? [...items, { to: '/seat', label: strings.nav.mySeat, icon: StarIcon }] : items

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <main className="flex-1 px-4 pb-28 pt-[calc(1rem+env(safe-area-inset-top))]">
        <Outlet />
      </main>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]"
        aria-label="Main"
      >
        <ul className="mx-auto flex max-w-md">
          {nav.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-semibold ${
                    isActive ? 'text-brand' : 'text-muted'
                  }`
                }
              >
                <Icon />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
