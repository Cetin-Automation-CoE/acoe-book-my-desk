import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../components/Toast'
import { api } from '../lib/api'
import { errorMessage } from '../lib/errors'
import type { LunchChoice, LunchPlan } from '../lib/types'
import { keys } from './useData'

// Record (or clear) my lunch plan for one day. The chip flips at once; a failure flips it back.
export function useSetLunch(userId: string, date: string) {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (next: LunchChoice | null) => api.setLunch(userId, date, next),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: keys.lunch(date) })
      const previous = queryClient.getQueryData<LunchPlan[]>(keys.lunch(date))
      queryClient.setQueryData<LunchPlan[]>(keys.lunch(date), (rows = []) => {
        const others = rows.filter((r) => r.user_id !== userId)
        return next ? [...others, { user_id: userId, date, lunch: next, updated_at: new Date().toISOString() }] : others
      })
      return { previous }
    },
    onError: (err, _next, context) => {
      queryClient.setQueryData(keys.lunch(date), context?.previous)
      toast(errorMessage(err), 'error')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.lunch(date) }),
  })
}
