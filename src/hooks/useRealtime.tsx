import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export interface SeatChange {
  seatId: string
  date: string
  at: number
}

const SeatChangeContext = createContext<SeatChange | null>(null)

// Any change to bookings, releases or seats refreshes what is on screen; a short debounce collapses
// the burst of events a full-day booking produces. The last booking change is also exposed so the
// Book screen can flash the tile that was just taken.
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [change, setChange] = useState<SeatChange | null>(null)

  useEffect(() => {
    let timer: number | undefined
    let clearChange: number | undefined
    const refresh = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        // Profiles are included so a colleague's first-ever booking shows their name, not a placeholder;
        // progress so a counted day (a bookings update) refreshes the streak and badges.
        for (const key of ['bookings', 'my-bookings', 'releases', 'seat-schedule', 'seats', 'profiles', 'progress']) {
          queryClient.invalidateQueries({ queryKey: [key] })
        }
      }, 150)
    }

    const channel = supabase
      .channel('bookmydesk')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        const row = (payload.new ?? payload.old) as { seat_id?: string; date?: string } | undefined
        if (row?.seat_id && row.date) {
          // Exposed for two seconds: long enough for the tile flash, then forgotten.
          setChange({ seatId: row.seat_id, date: row.date, at: Date.now() })
          window.clearTimeout(clearChange)
          clearChange = window.setTimeout(() => setChange(null), 2000)
        }
        refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seat_releases' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seats' }, refresh)
      .subscribe()

    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(clearChange)
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return <SeatChangeContext.Provider value={change}>{children}</SeatChangeContext.Provider>
}

export function useSeatChange() {
  return useContext(SeatChangeContext)
}
