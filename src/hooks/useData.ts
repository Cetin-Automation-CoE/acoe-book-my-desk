import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { todayIn } from '../lib/dates'

export const keys = {
  settings: ['settings'] as const,
  seats: ['seats'] as const,
  profiles: ['profiles'] as const,
  bookings: (date: string) => ['bookings', date] as const,
  releases: (date: string) => ['releases', date] as const,
  seatSchedule: (seatId: string, from: string) => ['seat-schedule', seatId, from] as const,
  myBookings: (userId: string, from: string) => ['my-bookings', userId, from] as const,
}

export function useSettings() {
  return useQuery({ queryKey: keys.settings, queryFn: api.settings, staleTime: 5 * 60_000 })
}

export function useSeats() {
  return useQuery({ queryKey: keys.seats, queryFn: api.seats, staleTime: 60_000 })
}

export function useProfiles() {
  return useQuery({
    queryKey: keys.profiles,
    queryFn: api.profiles,
    staleTime: 60_000,
    select: (rows) => new Map(rows.map((p) => [p.user_id, p.display_name])),
  })
}

export function useDayBookings(date: string) {
  return useQuery({ queryKey: keys.bookings(date), queryFn: () => api.bookingsForDate(date) })
}

export function useDayReleases(date: string) {
  return useQuery({ queryKey: keys.releases(date), queryFn: () => api.releasesForDate(date) })
}

export function useMyBookings(userId: string, fromDate: string) {
  return useQuery({ queryKey: keys.myBookings(userId, fromDate), queryFn: () => api.myBookings(userId, fromDate) })
}

export function useSeatSchedule(seatId: string | null, fromDate: string) {
  return useQuery({
    queryKey: keys.seatSchedule(seatId ?? '', fromDate),
    enabled: Boolean(seatId),
    queryFn: async () => {
      const [bookings, releases] = await Promise.all([
        api.bookingsForSeat(seatId!, fromDate),
        api.releasesForSeat(seatId!, fromDate),
      ])
      return { bookings, releases }
    },
  })
}

// Office-time-zone "today"; re-evaluated every 30 s so the day strip rolls over at midnight.
export function useToday(tz: string) {
  const [today, setToday] = useState(() => todayIn(tz))
  useEffect(() => {
    const id = window.setInterval(() => setToday(todayIn(tz)), 30_000)
    return () => window.clearInterval(id)
  }, [tz])
  return today
}
