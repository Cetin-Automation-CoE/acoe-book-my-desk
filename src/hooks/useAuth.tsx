import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface AuthState {
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({ session: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true })
  const queryClient = useQueryClient()
  const userId = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      userId.current = data.session?.user.id ?? null
      setState({ session: data.session, loading: false })
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? null
      // A different person (or nobody) is signed in now: nothing fetched before may be shown to them.
      if (userId.current !== undefined && userId.current !== next) queryClient.clear()
      userId.current = next
      setState({ session, loading: false })
    })
    return () => sub.subscription.unsubscribe()
  }, [queryClient])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const { session, loading } = useContext(AuthContext)
  return {
    session,
    loading,
    user: session?.user ?? null,
    signOut: () => supabase.auth.signOut(),
  }
}
