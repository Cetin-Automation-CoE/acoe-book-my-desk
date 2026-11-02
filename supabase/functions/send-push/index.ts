// Sends Web Push messages. Called by the database (pg_net) with a shared secret; never by browsers.
// Body: { messages: [{ user_id, title, body, url, tag }] }. Dead subscriptions (404/410) are removed.
// Deploy with --no-verify-jwt (the caller is Postgres, not a signed-in user).

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

interface Message {
  user_id: string
  title: string
  body: string
  url?: string
  tag?: string
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('PUSH_SHARED_SECRET')
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('unauthorized', { status: 401 })
  }
  const subject = Deno.env.get('VAPID_SUBJECT')
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!subject || !publicKey || !privateKey) return new Response('vapid keys missing', { status: 500 })
  webpush.setVapidDetails(subject, publicKey, privateKey)

  const { messages } = (await req.json()) as { messages?: Message[] }
  if (!messages?.length) return Response.json({ sent: 0, removed: 0 })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const userIds = [...new Set(messages.map((m) => m.user_id))]
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', userIds)
  if (error) return new Response(error.message, { status: 500 })

  let sent = 0
  const dead: string[] = []
  await Promise.all(
    (subs ?? []).map(async (s) => {
      for (const m of messages.filter((m) => m.user_id === s.user_id)) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title: m.title, body: m.body, url: m.url, tag: m.tag }),
            { TTL: 6 * 3600 },
          )
          sent += 1
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode
          if (status === 404 || status === 410) dead.push(s.id)
          else console.error('push failed', status, (e as Error).message)
        }
      }
    }),
  )
  if (dead.length) await supabase.from('push_subscriptions').delete().in('id', dead)
  return Response.json({ sent, removed: dead.length })
})
