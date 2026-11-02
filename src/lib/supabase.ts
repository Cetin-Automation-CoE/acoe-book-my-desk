import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { env } from './env'

export const supabase = createClient<Database>(
  env.supabaseUrl || 'http://localhost',
  env.supabaseAnonKey || 'missing',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } },
)
