# BookMyDesk

Mobile-first web app for booking seats in the office. Colleagues sign in with their
work email (6-digit code), pick a day and tap a free seat. Seat owners can
release their semi-fixed seats. Everyone in can say whether they bring a lunchbox or go out for lunch. A favourite seat is one tap away, "Surprise me" picks a random free one, and a booking ends in a little confetti. The UI is in English and Czech (switch in the profile sheet).

Plan and decisions: [Project plan](https://claude.ai/artifact/95CmY1gzyEdUJVkzhLnKLh) ·
[docs/decisions.md](docs/decisions.md)

## Stack

| Part | Choice |
|------|--------|
| Frontend | Vite + React + TypeScript + Tailwind, installable PWA (`vite-plugin-pwa`), `HashRouter`; visual design from `docs/design/` |
| Hosting | GitHub Pages, deployed by GitHub Actions on every push to `main` |
| Backend | Supabase (Postgres, Auth, Realtime, pg_cron), EU region; schema in `supabase/migrations` |
| Email | Custom SMTP (Brevo) for sign-in codes; Web Push (VAPID) for notifications |

All booking rules are enforced in Postgres functions behind RLS; the frontend only calls them.

## Repository layout

```
.github/workflows/   deploy.yml (Pages), ci.yml (lint/test/pgTAP), keepalive.yml
docs/                decisions.md, design/ (the Claude Design hand-off: HANDOFF.md + clickable prototype)
public/              PWA icons (placeholders, regenerate with `npm run icons`)
scripts/             make-icons.mjs
src/                 React app; all UI text in src/strings.ts
supabase/            config.toml, migrations/, seed.sql, tests/ (pgTAP), templates/
```

## Local development

Prerequisites: Node 22+, Docker Desktop (for the local Supabase stack).

```bash
npm install
```

```bash
npm run db:start
```

`db:start` prints the local API URL and anon key. Copy `.env.example` to `.env.local` and paste
the anon key, then:

```bash
npm run dev
```

Open http://localhost:5173. Sign-in emails are not sent locally — read the code in Mailpit at
http://127.0.0.1:54324. Supabase Studio is at http://127.0.0.1:54323.

Useful scripts:

| Script | What it does |
|--------|--------------|
| `npm run db:reset` | Re-applies all migrations and `supabase/seed.sql` |
| `npm run db:types` | Regenerates `src/lib/database.types.ts` from the local database |
| `npm test` | Vitest (date/slot helpers) |
| `npm run test:db` | pgTAP tests in `supabase/tests` (local stack must be running) |
| `npm run typecheck` / `npm run lint` / `npm run build` | What CI runs |

## One-time production setup (manual)

1. **Create the Supabase project** at supabase.com in the EU (Frankfurt) region. Note the
   Project URL and the anon (or publishable) key from Project Settings → API.
2. **Apply the schema and seed:**
   ```bash
   npx supabase login
   ```
   ```bash
   npx supabase link --project-ref <project-ref>
   ```
   ```bash
   npx supabase db push --remote --include-seed
   ```
   (`--remote` targets the linked project; without it the CLI pushes to the local stack.)
   Later schema changes: add a migration and run `npx supabase db push --remote`. The migrations enable
   `pg_cron` and schedule the auto-release and purge jobs; check Integrations → Cron afterwards.
3. **Auth settings** (Authentication in the dashboard):
   - Providers → Email: enabled. Leave "Confirm email" on. Set *Email OTP Length* to **6** and save
     (new projects default to 8). The app accepts exactly six digits, so an 8-digit code cannot be
     entered — if colleagues report that, this setting has drifted.
   - Email Templates → *Confirm signup* **and** *Magic Link*: replace the body with the contents of
     `supabase/templates/magic_link.html` (it shows `{{ .Token }}`, the 6-digit code, instead of a
     link, because corporate mail scanners consume links; its preheader repeats the code so it shows
     in the phone's notification). Set the subject to "Your BookMyDesk sign-in code".
   - URL Configuration → Site URL: `https://<org>.github.io/<repo>/`.
4. **Custom SMTP** — the built-in Supabase mailer only reaches project team members at 2 emails
   per hour. The project uses Brevo (free plan, 300 emails/day): verify a sender address under
   Senders, Domains & Dedicated IPs → Senders, then under SMTP & API → SMTP generate an SMTP key and
   note the login shown there (`<id>@smtp-brevo.com`). In Authentication → Emails → SMTP Settings
   enter host `smtp-relay.brevo.com`, port 587, username = that login, password = the SMTP key,
   sender = the verified address. Rate limits (Authentication → Rate Limits) default to 30 emails/hour
   once custom SMTP is on, which is enough.
   Deliverability caveat: the sender must be on a domain that is DNS-authenticated (SPF/DKIM) for the
   provider, otherwise Microsoft 365 quarantines the codes sent to `@cetin.cz` mailboxes as spoofing.
   `cetin.cz` itself cannot be authenticated without IT, so either authenticate a domain you own in
   Brevo, or (interim) let people sign in with a personal mailbox listed in `directory` (see Admin
   tasks). Brevo refuses senders on DMARC-protected domains outright, so the sender stays a freemail
   address until a domain is authenticated. Mailjet (`in-v3.mailjet.com`, username = API key,
   password = secret key) was used before and remains a fallback; it held Gmail deliveries in
   "Queued" on its shared free-tier address.
5. **Email domain allow-list** — defaults to `cetin.cz`; change in the SQL editor if needed:
   `update public.settings set allowed_email_domains = '{cetin.cz}';`
6. **GitHub Pages** — repository Settings → Pages → Source: *GitHub Actions*.
7. **GitHub Actions variables** — Settings → Secrets and variables → Actions → *Variables*:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. (The anon key is public by design; the
   `service_role` key must never be added anywhere in GitHub or the repo.) Add `BASE_PATH=/`
   only if you serve the app from a custom domain.
8. **Seat owners and names** — `seed.sql` assigns B21101 to Jiří Forman and B21102 to Martin
   Minarovič, lists all twelve colleagues (both addresses each) in `directory`, and marks Kryštof as
   admin. New colleagues go into `directory` the same way (see "Admin tasks").
9. **Push to `main`** — the deploy workflow builds and publishes the app. The keep-alive
   workflow pings the project twice a week so the free tier does not pause.

### Push notifications (optional, manual)

Web Push with VAPID: works in the installed PWA on iOS 16.4+, and in Chrome/Firefox/Edge. Everything is
opt-in per person (profile sheet → Notifications). Two kinds exist: the evening reminder before a
booked day and a Monday nudge for people with nothing booked that week.

1. **Keys** — once: `npx web-push generate-vapid-keys`. Public key → GitHub Actions *Variables* as
   `VITE_VAPID_PUBLIC_KEY`. Both keys → Supabase secrets (never the repo):
   ```bash
   npx supabase secrets set VAPID_PUBLIC_KEY=<public> VAPID_PRIVATE_KEY=<private> VAPID_SUBJECT=mailto:<your address> PUSH_SHARED_SECRET=<long random string>
   ```
2. **Deploy the sender** (called by Postgres, so without JWT verification):
   ```bash
   npx supabase functions deploy send-push --no-verify-jwt
   ```
3. **Tell the database** (SQL editor): the same shared secret into Vault, and the function URL:
   ```sql
   select vault.create_secret('<long random string>', 'push_shared_secret');
   update public.settings set push_function_url = 'https://<project-ref>.supabase.co/functions/v1/send-push';
   ```
   Push stays silent while either is missing. `push_evening_hour` (17) and `push_monday_hour` (7) are
   office-time hours; the hourly `bookmydesk-push-scheduled` job checks them, so DST needs no attention.
4. **Push `main`** so the build carries the public key, then colleagues add the app to their Home Screen
   and switch notifications on in the profile sheet.

Troubleshooting: `select * from net._http_response order by created desc limit 5;` shows the sender's
answers; the function logs are under Edge Functions → send-push → Logs. Dead subscriptions are removed
automatically; `public.push_log` records what was sent to whom.

### Making someone an admin

Before their first sign-in, set it in the directory (the seed already does this for Kryštof):

```sql
update public.directory set role = 'admin' where email in ('penka.krystof@cetin.cz', 'kr078468@cetin.cz');
```

For an account that already exists:

```sql
update public.profiles set role = 'admin' where email = 'name@cetin.cz';
```

### Admin tasks (Supabase dashboard, until an admin screen exists)

Use Table Editor or the SQL editor as the `postgres` role (bypasses RLS):

- **Assign a seat owner (before or after they sign in):**
  `update public.seats set owner_emails = '{ma077535@cetin.cz,minarovic.martin@cetin.cz}', owner_name = 'Martin Minarovič' where code = 'B21102';`
  List every address the person might sign in with. The seat is held from that moment; `owner_id`
  links itself when the person signs in (or immediately if they already have an account). The first
  account that matches keeps the seat, so ask owners to always use the same address.
- **Remove an owner:** `update public.seats set owner_emails = '{}', owner_id = null where code = 'B21102';`
- **Let someone sign in with a personal mailbox** (interim, while the company mail gateway quarantines
  the codes): list the address in the directory and it is allowed regardless of domain —
  `insert into public.directory (email, display_name) values ('name@gmail.com', 'Jane Doe') on conflict (email) do update set display_name = excluded.display_name;`
  Keep personal addresses out of the repo; add them in the SQL editor. A person who uses both a work
  and a personal address gets two separate accounts, so ask everyone to stick to one.
- **Add colleagues' names** (so ID-style addresses do not show as "Ma077535"):
  `insert into public.directory (email, display_name) values ('ma077535@cetin.cz', 'Martin Minarovič') on conflict (email) do update set display_name = excluded.display_name;`
  The name is applied at the person's first sign-in; for existing accounts update `profiles.display_name`.
- **Disable / enable a seat:** `update public.seats set active = false where code = 'B21112';`
- **Add seats, floors or offices:** insert rows into `seats`, `floors`, `offices`.
- **Room order:** the Book screen draws seats in `seats.sort_order` as side-by-side pairs (two pairs
  per table block, then a gap). Change `sort_order` to rearrange; keep partners on consecutive numbers.
- **Change rules:** edit the single row in `settings` (working days, slot times, weekly limit, data
  retention).
- **Fix a display name:** `update public.profiles set display_name = 'Jane Doe' where email = '...';`
- **Profile photos** live in the public `avatars` storage bucket (created by migration `20261104120000`, 2 MB
  limit, JPEG/PNG/WebP) as `<user_id>/avatar.jpg`; the app shrinks them to 256 px before upload. To remove
  someone's photo: delete the object in Storage and `update public.profiles set avatar_url = null where ...`.
- **Sign-in codes stop arriving:** check Brevo → Transactional → Logs (Delivered / Blocked / Soft bounce),
  then the recipient's Junk folder and the Microsoft 365 quarantine (https://security.microsoft.com/quarantine).
  Brevo's free plan allows 300 emails/day; the login and SMTP key in Supabase → Authentication →
  Emails → SMTP Settings must match Brevo → SMTP & API → SMTP.

## Booking rules (as implemented)

All times are in `settings.timezone` (Europe/Prague), never the server's UTC date.

| Rule | Behaviour |
|------|-----------|
| Whole days | The app books whole days: both halves (`AM` 06:00–13:00, `PM` 13:00–24:00, from `am_start` / `pm_start`) in one atomic call, or only the afternoon once today's afternoon has started. The database still stores and validates halves (decision 61). |
| Window | Whole working weeks, `booking_weeks` of them (default 2: this week and next), from today on. The first is the current week, or the coming one from the weekend on (after the last day in `working_days`, default Mon–Fri). Other dates are rejected (`outside_window`, `not_working_day`). The app moves between weeks with arrows or a swipe on the day strip. |
| Same day | Today can be booked until the afternoon ends; after 13:00 a booking covers the rest of the day. |
| Limits | One active booking per seat per half day; one per person per half day (partial unique indexes), which in the app means one seat per person per day. Optional `max_days_per_week`. |
| Cancel | In the app, until the day starts at 06:00; the database itself still allows a half that has not started to be cancelled on its own. |
| Semi-fixed seats | `seats.owner_id` holds the seat; others can book it only after the owner releases the day (My seat tab). Releasing cancels the owner's own booking for that day; a released day cannot be taken back once a colleague booked it. An owner books their own seat only (`owner_own_seat_only`), even on a day they released it; the app dims every other seat for them. |
| No check-in | A reservation is the commitment: there is no "I'm here", no deadline and no auto-release (removed 2026-11-02; the `checked_in` / `released` statuses only remain for rows written before). |
| Retention | Bookings and releases older than `booking_retention_days` (90) are deleted nightly. |
| Lunch | Anyone in on a day (booked, or a seat owner on a held day) can say whether they bring a lunchbox or go out, from the Book tab card or Who's in. Colleagues see a mark on each row and the counts; `lunch_plans` rows are the person's own (RLS) and are purged with old bookings. |
| Favourite seat | The heart on a seat sheet makes that seat your favourite (`user_prefs`, own row only, written by `set_favourite_seat()`). The Book tab card offers it ahead of the seat you booked most in the last 28 days; if it is taken, the nearest free seat. Seat owners have no favourite: their own seat is always offered. |
| Surprise me | The dice on the Book tab shuffles across the seats free for that day and lands on a random one; nothing is booked until "Book it". If a colleague books it first, it spins again by itself (up to 3 times). Hidden for seat owners and once you have a seat that day. |
| Celebrations | Confetti and a short buzz on a booking, a bigger burst for a new badge, a light tick per shuffle hop. Per-device switch in the profile sheet (`localStorage` `bmd.celebrations`), on by default; reduced motion turns off the confetti and the shuffle. Vibration works on Android only. |
| Out of office | Who's in lists everyone on the team who is neither booked nor holding their seat that day under "Out of office". Nothing is stored or set by hand: `team_roster()` returns one row per person (directory people merged across both addresses, plus anyone else who has signed in; accounts nobody signed in to are left out), and the app subtracts whoever is in. |

### Progress and badges (private to each person)

An **office day** is a day with a reservation. A booking is counted once its half day has started
(06:00 / 13:00 — from then on it cannot be cancelled): the `bookmydesk-count-office-days` job runs
every 15 minutes, and a booking made after the start is counted immediately. A cancelled booking
never counts. Counters live in
`user_stats` and badges in `achievements` (`bookings.counted_at` marks what has been counted); both
survive the 90-day purge and are readable only by the person themselves — no leaderboard, colleagues
never see each other's numbers.

| Shown on My bookings | Meaning |
|------|---------|
| Week streak | Consecutive ISO weeks with at least one office day |
| Best streak | Longest week streak so far |
| Office days | Days with a reservation, ever |

| Badge | Rule |
|-------|------|
| First day in | First office day |
| Regular / Resident | 10 / 50 office days |
| Explorer | Sat in 6 different seats |
| Full house | Every active seat booked at the same time |
| On a roll | 4-week streak |
| Full week | An office day on every working day of one week |

Badges are awarded in `bmd_count_office_day()`; adding one means a new key in the `achievements`
check constraint, a rule in that function and a name in `src/strings.ts`. To reset someone's progress:
`delete from public.user_stats where user_id = '…'; delete from public.achievements where user_id = '…';`
(and `update public.bookings set counted_at = null where user_id = '…'` to count their recent days again).

### Settings reference (`public.settings`, one row)

| Column | Default | Meaning |
|--------|---------|---------|
| `allowed_email_domains` | `{cetin.cz}` | Who may sign up; empty array allows everyone |
| `timezone` | `Europe/Prague` | Office time zone for every rule |
| `working_days` | `{1,2,3,4,5}` | ISO weekdays that can be booked (1 = Mon … 7 = Sun); the week ends on the last one listed |
| `am_start`, `pm_start` | `06:00`, `13:00` | When each half day starts (PM start is also the AM/PM split) |
| `booking_weeks` | `2` | How many working weeks can be booked: 1 = the current week only, 2 = this week and next (1–8) |
| `max_days_per_week` | `null` | Optional limit of distinct booked days per ISO week |
| `booking_retention_days` | `90` | Nightly purge threshold |

### Scheduled jobs

The migrations enable `pg_cron` and schedule two jobs (visible in the dashboard under
Integrations → Cron, or `select * from cron.job;`):

- `bookmydesk-purge-old-bookings` — daily 03:30 UTC, `public.purge_old_bookings()`
- `bookmydesk-count-office-days` — every 15 minutes, `public.count_office_days()` (progress and badges)
- `bookmydesk-push-scheduled` — hourly, `public.push_scheduled()` (evening reminders, Monday nudges; no-op until push is set up)

pg_cron schedules are in UTC; the functions convert to the office time zone themselves, so DST
changes need no attention. Run `select public.count_office_days();` in the SQL editor to count
started bookings right away.

## Security notes

- Row-level security is on for every table; signed-in users can read seats, bookings, releases
  and colleagues' display names, and can write nothing directly.
- Every change goes through `security definer` functions (`book_seat`, `cancel_booking`,
  `release_my_seat`, `unrelease_my_seat`) that use `auth.uid()` and validate all rules.
  They raise short error codes (`seat_taken`, `outside_window`, …) that `src/strings.ts` translates.
- The rules are covered by pgTAP tests in `supabase/tests` (run on every PR by CI).
- Sign-ups are restricted by a database trigger, not only in the UI: the address must be on an allowed
  domain (`settings.allowed_email_domains`) or listed in `public.directory`.
- The frontend ships only the Supabase URL and anon key.
