# BookMyDesk

Mobile-first web app for booking seats in the office open space. Colleagues sign in with their
work email (6-digit code), pick a day and a half-day slot, and tap a free seat. Seat owners can
release their semi-fixed seats; bookings without check-in are released automatically.

Plan and decisions: [Project plan](https://claude.ai/artifact/95CmY1gzyEdUJVkzhLnKLh) ·
[docs/decisions.md](docs/decisions.md)

## Stack

| Part | Choice |
|------|--------|
| Frontend | Vite + React + TypeScript + Tailwind, installable PWA (`vite-plugin-pwa`), `HashRouter` |
| Hosting | GitHub Pages, deployed by GitHub Actions on every push to `main` |
| Backend | Supabase (Postgres, Auth, Realtime, pg_cron), EU region; schema in `supabase/migrations` |
| Email | Custom SMTP (Brevo or Resend) for sign-in codes |

All booking rules are enforced in Postgres functions behind RLS; the frontend only calls them.

## Repository layout

```
.github/workflows/   deploy.yml (Pages), ci.yml (lint/test/pgTAP), keepalive.yml
docs/                decisions.md
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
   - Providers → Email: enabled. Leave "Confirm email" on. Set *Email OTP Length* to 6 (new projects
     default to 8; the app accepts 6–10 digits either way).
   - Email Templates → *Confirm signup* **and** *Magic Link*: replace the body with the contents of
     `supabase/templates/magic_link.html` (it shows `{{ .Token }}`, the 6-digit code, instead of a
     link, because corporate mail scanners consume links). Set the subject to
     "Your BookMyDesk sign-in code".
   - URL Configuration → Site URL: `https://<org>.github.io/<repo>/`.
4. **Custom SMTP** — the built-in Supabase mailer only reaches project team members at 2 emails
   per hour. The project uses Mailjet (free tier): validate a sender address under Senders & Domains,
   copy the API key and secret key, then in Authentication → Emails → SMTP Settings enter host
   `in-v3.mailjet.com`, port 587, username = API key, password = secret key, sender = the validated
   address. Rate limits (Authentication → Rate Limits) default to 30 emails/hour once custom SMTP
   is on, which is enough.
   Deliverability caveat: the sender must be on a domain that is DNS-authenticated (SPF/DKIM) for the
   provider, otherwise Microsoft 365 quarantines the codes sent to `@cetin.cz` mailboxes as spoofing.
   `cetin.cz` itself cannot be authenticated without IT, so either authenticate a domain you own in
   Mailjet, or (interim) let people sign in with a personal mailbox listed in `directory` (see Admin
   tasks). Brevo works the same way but refuses senders on DMARC-protected domains outright.
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
- **Change rules:** edit the single row in `settings` (booking window, check-in deadlines, slot
  times, owner check-in exemption, weekly limit, data retention).
- **Fix a display name:** `update public.profiles set display_name = 'Jane Doe' where email = '...';`
- **Sign-in codes stop arriving:** check Mailjet → Statistics (Delivered / Blocked / Bounced), then
  the recipient's Junk folder and the Microsoft 365 quarantine (https://security.microsoft.com/quarantine).
  Mailjet's free tier allows 200 emails/day; the API key and secret in Supabase → Authentication →
  Emails → SMTP Settings must match Mailjet → Account → API Key Management.

## Booking rules (as implemented)

All times are in `settings.timezone` (Europe/Prague), never the server's UTC date.

| Rule | Behaviour |
|------|-----------|
| Slots | `AM` 06:00–13:00, `PM` 13:00–24:00 (`am_start`, `pm_start`). "Full day" books both halves atomically. |
| Window | Today + `booking_window_days` (7), working days only (`working_days`, default Mon–Fri). Other dates are rejected (`outside_window`, `not_working_day`). |
| Same day | A half day can be booked until it ends. Booking after its check-in deadline counts as checked in (walk-in). |
| Limits | One active booking per seat per half day; one per person per half day (partial unique indexes). Optional `max_days_per_week`. |
| Check-in | "I'm here" on the day, until `am_checkin_deadline` (10:00) / `pm_checkin_deadline` (14:00). |
| Auto-release | Every 15 minutes, `booked` bookings past their deadline become `released`. Seat owners are exempt while `owner_checkin_exempt` is true. |
| Cancel | Any time before the half day starts. Checked-in bookings cannot be cancelled. |
| Semi-fixed seats | `seats.owner_id` holds the seat; others can book a half day only after the owner releases it (My seat tab). Releasing cancels the owner's own booking for that half day; a released half day cannot be taken back once a colleague booked it. |
| Retention | Bookings and releases older than `booking_retention_days` (90) are deleted nightly. |

### Settings reference (`public.settings`, one row)

| Column | Default | Meaning |
|--------|---------|---------|
| `allowed_email_domains` | `{cetin.cz}` | Who may sign up; empty array allows everyone |
| `timezone` | `Europe/Prague` | Office time zone for every rule |
| `booking_window_days` | `7` | Days ahead that can be booked |
| `working_days` | `{1,2,3,4,5}` | ISO weekdays that can be booked (1 = Mon … 7 = Sun); weekends are hidden in the app |
| `am_start`, `pm_start` | `06:00`, `13:00` | When each half day starts (PM start is also the AM/PM split) |
| `am_checkin_deadline`, `pm_checkin_deadline` | `10:00`, `14:00` | Check-in deadlines |
| `owner_checkin_exempt` | `true` | Seat owners are never auto-released |
| `max_days_per_week` | `null` | Optional limit of distinct booked days per ISO week |
| `booking_retention_days` | `90` | Nightly purge threshold |

### Scheduled jobs

The migration enables `pg_cron` and schedules two jobs (visible in the dashboard under
Integrations → Cron, or `select * from cron.job;`):

- `bookmydesk-auto-release` — every 15 minutes, `public.auto_release_bookings()`
- `bookmydesk-purge-old-bookings` — daily 03:30 UTC, `public.purge_old_bookings()`

pg_cron schedules are in UTC; the functions convert to the office time zone themselves, so DST
changes need no attention. Run `select public.auto_release_bookings();` in the SQL editor to
trigger a release manually.

## Security notes

- Row-level security is on for every table; signed-in users can read seats, bookings, releases
  and colleagues' display names, and can write nothing directly.
- Every change goes through `security definer` functions (`book_seat`, `cancel_booking`,
  `check_in`, `release_my_seat`, `unrelease_my_seat`) that use `auth.uid()` and validate all rules.
  They raise short error codes (`seat_taken`, `outside_window`, …) that `src/strings.ts` translates.
- The rules are covered by pgTAP tests in `supabase/tests` (run on every PR by CI).
- Sign-ups are restricted by a database trigger, not only in the UI: the address must be on an allowed
  domain (`settings.allowed_email_domains`) or listed in `public.directory`.
- The frontend ships only the Supabase URL and anon key.
