import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Any change to bookings, releases or seats refreshes what is on screen; a short debounce
// collapses the burst of events a full-day booking produces.
export function useRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let timer: number | undefined
    const refresh = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        // Profiles are included so a colleague's first-ever booking shows their name, not a placeholder.
        for (const key of ['bookings', 'my-bookings', 'releases', 'seat-schedule', 'seats', 'profiles']) {
          queryClient.invalidateQueries({ queryKey: [key] })
        }
      }, 150)
    }

    const channel = supabase
      .channel('bookmydesk')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seat_releases' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seats' }, refresh)
      .subscribe()

    return () => {
      window.clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}
