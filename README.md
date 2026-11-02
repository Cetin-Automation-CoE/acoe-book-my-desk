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
   npx supabase db push --include-seed
   ```
   Later schema changes: add a migration and run `npx supabase db push`.
3. **Auth settings** (Authentication in the dashboard):
   - Providers → Email: enabled. Leave "Confirm email" on.
   - Email Templates → *Confirm signup* **and** *Magic Link*: replace the body with the contents of
     `supabase/templates/magic_link.html` (it shows `{{ .Token }}`, the 6-digit code, instead of a
     link, because corporate mail scanners consume links). Set the subject to
     "Your BookMyDesk sign-in code".
   - URL Configuration → Site URL: `https://<org>.github.io/<repo>/`.
4. **Custom SMTP** — the built-in Supabase mailer only reaches project team members at 2 emails
   per hour. Create a free Brevo or Resend account, verify a sender domain (or at least a sender
   address), then in Project Settings → Authentication → SMTP Settings enter host, port, user,
   password and sender. Raise Authentication → Rate Limits → "emails per hour" to e.g. 60.
   Test that a code reaches a `@cetin.cz` inbox and is not filtered as spam.
5. **Email domain allow-list** — defaults to `cetin.cz`; change in the SQL editor if needed:
   `update public.settings set allowed_email_domains = '{cetin.cz}';`
6. **GitHub Pages** — repository Settings → Pages → Source: *GitHub Actions*.
7. **GitHub Actions variables** — Settings → Secrets and variables → Actions → *Variables*:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. (The anon key is public by design; the
   `service_role` key must never be added anywhere in GitHub or the repo.) Add `BASE_PATH=/`
   only if you serve the app from a custom domain.
8. **Push to `main`** — the deploy workflow builds and publishes the app. The keep-alive
   workflow pings the project twice a week so the free tier does not pause.

### Making someone an admin

In the SQL editor (after the person has signed in once):

```sql
update public.profiles set role = 'admin' where email = 'name@cetin.cz';
```

### Admin tasks (Supabase dashboard, until an admin screen exists)

Use Table Editor or the SQL editor as the `postgres` role (bypasses RLS):

- **Assign a seat owner:** `update public.seats set owner_id = (select user_id from public.profiles where email = 'name@cetin.cz') where code = 'B21101';`
- **Remove an owner:** `update public.seats set owner_id = null where code = 'B21101';`
- **Disable / enable a seat:** `update public.seats set active = false where code = 'B21112';`
- **Add seats, floors or offices:** insert rows into `seats`, `floors`, `offices`.
- **Change rules:** edit the single row in `settings` (booking window, check-in deadlines, slot
  times, owner check-in exemption, weekly limit, data retention).
- **Fix a display name:** `update public.profiles set display_name = 'Jane Doe' where email = '...';`

## Security notes

- Row-level security is on for every table; signed-in users can read seats, bookings, releases
  and colleagues' display names, and can write nothing directly.
- Every change goes through `security definer` functions (`book_seat`, `cancel_booking`,
  `check_in`, `release_my_seat`, `unrelease_my_seat`) that use `auth.uid()` and validate all rules.
- Sign-ups are restricted to the allowed email domains by a database trigger, not only in the UI.
- The frontend ships only the Supabase URL and anon key.
