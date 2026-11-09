import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../components/Toast'
import { api } from '../lib/api'
import { errorMessage } from '../lib/errors'
import { keys } from './useData'
import { useT } from './useLang'

// Picks or clears my favourite seat (the heart on a seat sheet).
export function useSetFavourite(userId: string) {
  const t = useT()
  const toast = useToast()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ seatId }: { seatId: string | null; code: string }) => api.setFavouriteSeat(seatId),
    onSuccess: (_, { seatId, code }) => {
      queryClient.setQueryData(keys.favourite(userId), seatId)
      toast(seatId ? t.favourite.saved(code) : t.favourite.removed)
    },
    onError: (err) => {
      toast(errorMessage(err), 'error')
      queryClient.invalidateQueries({ queryKey: keys.favourite(userId) })
    },
  })
}
