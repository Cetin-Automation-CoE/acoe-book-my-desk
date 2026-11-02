const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export const env = {
  supabaseUrl: url ?? '',
  supabaseAnonKey: anonKey ?? '',
  isConfigured: Boolean(url && anonKey),
  // Empty when push is not set up for this deployment; the profile sheet then hides the switches.
  vapidPublicKey: vapidPublicKey ?? '',
}
