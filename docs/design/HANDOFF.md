# Handoff: BookMyDesk mobile UI v2 (visual redesign)

## Overview
This is a visual redesign of every screen in the existing BookMyDesk PWA (`acoe-book-my-desk`): Sign in, Book (Day view), the booking sheet, My bookings, Who's in, My seat and Profile, plus the empty, loading and error states.
**Booking rules, data model, RPCs and RLS do not change.** This is UI work only, plus three small client-side behaviours (see "New behaviour").

The design is synced to the repo as of 2026-11-02. It already accounts for:
- working days only (`settings.working_days`)
- the paired-table seat grid (`roomBlocks`, decision 38: no floor map)
- `owner_name` / `owner_emails`
- the "address not registered" sign-in copy

## About the design files
`BookMyDesk v2.dc.html` is a **design reference built in HTML**, a clickable prototype with mock data. It is **not production code to copy**. Recreate it in the existing Vite + React + TypeScript + Tailwind v4 codebase, using its patterns: `src/components/*`, `src/strings.ts`, the `@theme` tokens in `src/index.css`, and React Query hooks.

To view it, open `BookMyDesk v2.dc.html` in a browser from this folder. It loads `support.js` and `ios-frame.jsx`. The phone frame is presentation only and should not be implemented.

Everything after the line `const S = {` in the file's `<script>` is the mock logic. It mirrors `seatState.ts` / `dates.ts`. It's useful for reading the exact copy and the derived states, but don't port it.

## Fidelity
**High fidelity.** Colours, type, spacing, radii, shadows and motion are final. Match them exactly using Tailwind utilities and the tokens below.

---

## Design tokens
Add these to `@theme` in `src/index.css`. The existing tokens stay as they are.

| Token | Value | Use |
|---|---|---|
| `--color-brand` | `#300091` | existing |
| `--color-brand-deep` | `#1a0060` | existing; toast bg, overlay tint |
| `--color-accent` | `#f12e49` | existing; today dot, errors, danger |
| `--color-sky` | `#41b6e6` | existing; live dot, check-in ring, "you" dots, realtime flash |
| `--color-lilac` | `#6f79bd` | existing; held seat number |
| `--color-lilac-soft` | `#a7a4e0` | existing; held bg at 32% (`bg-lilac-soft/32`) |
| `--color-surface` | `#f5f6fa` | existing; page / panel bg, ticket notches |
| `--color-line` | `#d7dae1` | existing |
| `--color-line-strong` | `#cdd4e5` | existing; input borders |
| `--color-muted` | `#66678a` | existing; secondary text (≥4.5:1 on white) |
| `--color-taken` | `#eff0f5` | **new**; taken tile / booked cell bg |
| `--color-taken-ink` | `#9497b0` | **new**; taken seat number + "B211" prefix |
| `--color-brand-hi` | `#5a33d6` | **new**; highlight stop of the "mine" gradient |

**Gradients** (the only two):
- `--bg-mine: radial-gradient(120% 120% at 100% 0%, #5a33d6 0%, #300091 55%)`. Used on: my seat tile, today's ticket, sheet seat badge, profile avatar, the future-booking badge.
- `--bg-band`: four layered backgrounds on `#300091`:
  ```
  radial-gradient(120% 90% at 100% 0%, rgba(111,121,189,.55) 0%, rgba(48,0,145,0) 60%),
  radial-gradient(90% 70% at 0% 100%, rgba(65,182,230,.18) 0%, rgba(48,0,145,0) 60%),
  linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),
  linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px);
  background-size: 100% 100%, 100% 100%, 22px 22px, 22px 22px;
  ```
  The last two layers draw a faint 22px "floor plan" grid. Put this in one `.band` class in `index.css`; it's the one place a class beats utilities.

**Avatar tints** (initials on `brand-deep` text): `rgba(65,182,230,.22)`, `rgba(167,164,224,.5)`, `rgba(241,46,73,.13)`, `rgba(111,121,189,.26)`. Pick by a stable hash of `user_id`, modulo 4. The current user is always solid `brand` with white initials.

**Typography.** Keep the existing font stack (`Avenir Next LT Pro`, `Avenir Next`, Avenir, Arial…). Weights: 500 / 600 / 700 / **800** (800 is new and used for all display type). Use `tabular-nums` on every seat code, date number and time.

| Role | Size / line height | Weight | Notes |
|---|---|---|---|
| Band title | 34 / 40 | 800 | letter-spacing −0.025em, white |
| Band count (free seats) | 34 / 40 | 800 | |
| Sign-in wordmark | 38 / 42 | 800 | −0.02em |
| Ticket date number | 36 / 38 | 800 | −0.03em |
| Who's-in big number | 38 / 42 | 800 | brand |
| Seat tile number | 26 / 28 | 800 | −0.03em |
| Sheet title | 21 / 26 | 800 | |
| Card title | 19 / 24 (check-in) · 17 / 22 (row card) | 800 | |
| Section title ("Seats") | 19 / 24 | 800 | |
| Body | 15–16 / 22–24 | 400–600 | |
| Tile caption | 14 / 18 | 700 | |
| Tile sub, meta | 12–12.5 / 16 | 500 | |
| Eyebrow / overline | 11–12.5 / 16 | 700–800 | uppercase, +0.04–0.08em |
| Seat prefix "B211" | 9.5 / 12 | 700 | +0.04em |

**Radii:** 3 (mini-map cells, legend), 9–10 (avatars-in-chips, small buttons), 12 (toggle thumbs), 14 (inputs, code boxes, row buttons), 16 (primary buttons, tiles, slot cards, nav pill items, day pills), 18 (sheet badge, toast), 20 (nav item), 22 (table trays, lists), 24 (cards, tickets), 26 (nav bar), 28 (content panel top), 32 (sheets, sign-in sheet).

**Shadows:**
- card: `0 1px 2px rgba(26,0,96,.05), 0 10px 24px rgba(26,0,96,.06)`
- card-raised (smart card, Who's-in summary): `0 1px 2px rgba(26,0,96,.05), 0 14px 32px rgba(26,0,96,.10)`
- brand button: `0 10px 22px rgba(48,0,145,.30)`
- mine tile: `0 10px 22px rgba(48,0,145,.32)`
- selected day pill (on band): `0 10px 22px rgba(10,0,50,.30)`
- nav: `0 12px 32px rgba(26,0,96,.18), 0 1px 3px rgba(26,0,96,.08)`
- sheet: `0 -12px 40px rgba(26,0,96,.22)`
- toast: `0 14px 34px rgba(10,0,50,.35)`
- focus ring: `0 0 0 4px rgba(48,0,145,.14)` plus a `brand` border
- realtime flash ring: `0 0 0 4px rgba(65,182,230,.9)`, fading out over 700ms
- selected-seat ring (while its sheet is open): `0 0 0 4px rgba(48,0,145,.22)`

**Spacing:** a 4px base. Page gutter 16px. Card padding 14–16px. Gaps 6 / 8 / 10 / 12 / 14 / 18 / 22.

### Half-day glyph (new shared component)
`<HalfGlyph slot="AM|PM|FULL" size={11|12|14|16} />`. It's a circle with a 1.5px `currentColor` border (2px at 14–16px):
- AM fills the left half: `linear-gradient(90deg, currentColor 50%, transparent 50%)`
- PM fills the right half
- FULL is fully filled

It appears in the slot toggle, booking sheet slot cards, tickets, Who's-in headers, My seat column headers, and the top-right of seat tiles in Full-day mode. On tiles each half takes the colour of that half's state:
- free → `brand`
- mine → `#fff` on the mine tile
- taken → `#a6a8bf`
- held → `lilac`

Its border matches the tile ink.

---

## App shell (`AppShell.tsx`)
- **Page structure:** the whole page scrolls as one container. The band header scrolls with the content (large-title behaviour). Content sits in a **panel**: `bg-surface`, `rounded-t-[28px]`, `-mt-6` (overlapping the band by 24px), `px-4 pt-5 pb-[124px]`.
- **Band:** `.band` with padding top = `env(safe-area-inset-top) + 14px` (58px in the prototype, status bar included), 16px sides, 44px bottom. All text in it is white.
  - Row 1, 44px tall, right-aligned: a 40px avatar button. White/12 bg, 1.5px white/28 border, initials in 14/800. It opens the Profile sheet. There is no live / office label.
  - Row 2, `mt-2.5`: the title (34/800) and a sub line (15, white/72). On Book only, the right side shows the count of fully free seats for the current day and slot (34/800) with "free seats" under it (12.5, white/72).
- **PWA chrome:** set `index.html` `theme-color` to `#300091` and `apple-mobile-web-app-status-bar-style` to `black-translucent`, so the band runs under the status bar.
- **Bottom nav, floating:** `fixed`, left and right 14px, `bottom: max(12px, env(safe-area-inset-bottom))`.
  - Styling: `rounded-[26px]`, `p-1.5`, `bg-white/86`, `backdrop-blur-[20px] backdrop-saturate-[1.8]`, a 1px `white/70` border, nav shadow.
  - Items: `flex-1`, `rounded-[20px]`, `py-[7px]`, a 24px icon over an 11/700 label.
  - Active item: `text-brand` with a `bg-brand/9` pill. Inactive: `text-muted`.
  - The My bookings item gets a 9px `accent` dot (2px white ring) at top `4px`, left `calc(50% + 8px)` whenever a check-in is open today.
  - Tabs, as today: Book, My bookings, Who's in, and My seat for owners only.
- **Profile moves** from the bottom of My bookings into a sheet opened from the avatar (see Sheets).

## Screens

### 1. Sign in (`SignIn.tsx`)
- Full-height `.band`. The top area is flex-1 with padding 62/24/36.
  - Top right: a language toggle, glass style. Container `bg-white/10 border-white/16 rounded-xl p-[3px]`; two 40×30 buttons "EN" / "CS" in 13/700. Active: white bg, brand text. Inactive: `white/85`.
  - Bottom-aligned stack: the app icon at 76px with `rounded-[18px]` and `shadow-[0_18px_40px_rgba(10,0,50,.45),0_0_0_1px_rgba(255,255,255,.12)]`; then "BookMyDesk" in 38/800, `mt-6`; then the tagline in 17, white/74, `mt-2`.
- **Bottom sheet:** white, `rounded-t-[32px]`, padding 28/24/46, shadow `0 -12px 40px rgba(10,0,50,.25)`.
  - Email step: intro (15, `#404040`); label "Email" (13/700); input (56px, `rounded-[14px]`, 1.5px `line-strong`, 17px text, focus ring); error (14/600 accent); primary button "Send code" (56px, `rounded-2xl`, brand, 17/700, brand shadow).
  - Code step: six boxes in a `grid-cols-6 gap-2`, each 62px tall, `rounded-[14px]`, 28/800 brand digits.
    - Empty box: 1.5px `line-strong` border.
    - Filled box: `brand/35` border and `brand/4` bg.
    - Active box: `brand` border and the focus ring.
    - Error: `accent` borders.
  - Use one transparent `<input inputMode="numeric" autoComplete="one-time-code">` laid over the boxes. Render as many boxes as the configured OTP length; the current `pattern` allows 6–10.
  - Below: "Sign in" primary, then "Send a new code" and "Use a different email" as ghost 14/700 buttons with space-between.
- Copy is exactly the current `strings.auth`.

### 2. Book (`DayView.tsx`)
- **Band:**
  - Title: the relative day ("Today", "Tomorrow") or the weekday name.
  - Sub: "Monday, 2 November" for relative days, otherwise "4 November".
  - Free-seat count on the right.
- **Day strip** (`DayStrip.tsx`, on the band, `mt-5`, `flex gap-1.5`): one pill per bookable working day, `flex-1`, `rounded-2xl`, padding 8/0/7.
  - Content: weekday (11/700, uppercase, +0.06em), number (21/800), then a dot row (5px dots, 3px gap). The red dot = today; the sky dot = I have a booking that day.
  - Unselected pill: transparent, white number, weekday white/60.
  - Selected pill: white bg, brand number, weekday `brand/55`, day-pill shadow. Its "mine" dot turns `brand`.
  - **Week break:** when two consecutive bookable days aren't adjacent dates (Fri → Mon), add `ml-2` before the later one.
  - All pills fit with no horizontal scroll. Remove the `scrollIntoView` in the current component.
- **Slot toggle** (`SlotToggle.tsx`, on the band, `mt-3.5`): glass container `bg-white/10 border-white/14 rounded-2xl p-1 gap-0.5`. Each button: `rounded-xl py-[9px]`, 14/700, a HalfGlyph(12) before the label. Active: white bg, brand text, shadow `0 6px 16px rgba(10,0,50,.25)`. Inactive: `white/86`.
- **Smart card** (new `TodayCard` component, `mb-[22px]`, white, `rounded-3xl`, card-raised shadow). Pick the variant in this order:
  1. **Today, check-in open** (ring variant, padding 16, column, gap 14):
     - A 66px countdown ring. Implement it with a `conic-gradient(sky X%, rgba(48,0,145,.08) 0)` and a white inner disc inset 6px. X = minutes left ÷ (deadline − slot start), minimum 4%.
     - Inside the ring: "1:20" (16/800 brand) over "LEFT" (9.5/700 muted).
     - Next to the ring: eyebrow "TODAY · FULL DAY"; title "You're at B21105"; sub "Check in by 10:00".
     - Below: a full-width 54px primary button "I'm here". It checks in **all** of today's open bookings (see New behaviour).
  2. **Today, all checked in:** the ring full sky with a sky check icon. Sub "Checked in 08:40" in brand. No button.
  3. **Today, owner exempt:** the ring full lilac with a check. Sub "Your seat – no check-in needed".
  4. **Today, deadline passed:** the ring full accent, "0:00", sub in accent.
  5. **Future day booked** (row variant): a 56px `--bg-mine` badge showing "B211" / "05"; eyebrow "YOU'RE BOOKED"; title "B21105 · Full day"; sub = the date; a "Manage" outline button that opens the mine sheet.
  6. **No booking, usual seat free:** a badge with `bg-brand/6` and an inset `brand/14` ring; eyebrow "YOUR USUAL SEAT"; title "B21105 · Morning"; sub = the date; a "Book" button (44px, `rounded-[14px]`, brand shadow). **One tap books it**, no sheet, and shows a toast with Undo.
  7. **No booking, usual seat taken:** an accent dot plus eyebrow "B21105 IS TAKEN"; title = the suggested seat; sub "Right next to it" / "Same table" / "Closest free seat"; "Book".
  8. New user with no history, or both halves already over: no card.
- **Seat grid** (`SeatGrid.tsx`): keep `roomBlocks(views, 2)`.
  - Header row: "Seats" (19/800) on the left; on the right a compact legend in 12/600 muted with 10px swatches (Free, Mine, Taken, Held).
  - Each block: an overline row (11.5/700, uppercase, +0.08em, muted) reading "TABLE 1" on the left and "2 FREE" on the right. The right side is brand when above 0, otherwise muted.
  - Then a **tray**: white, `rounded-[22px]`, `p-2`, card shadow.
  - Pairs: `grid-cols-2 gap-1.5`. The second pair gets `mt-1.5 pt-1.5` and a `1.5px dashed #e3e5ee` top border (the table divider).
  - Blocks are spaced 18px apart (the aisle).
- **Seat tile:** a 76px-tall button, `rounded-2xl`, padding 0/8/0/11, flex row with gap 8.
  - Left, 33px wide: "B211" (9.5/700) over the number "05" (26/800).
  - Right, `min-w-0`: line 1 has an optional 22px avatar (initials 9/800) or a 14px star, then the caption (14/700, ellipsis). Line 2 is the sub (12/500, ellipsis) with an optional 13px check icon.
  - In Full-day mode an 11px HalfGlyph sits absolutely at top 9px, right 9px.
  - Pressed: `active:scale-[.96]`.

  | Kind | Bg | Border | Number / prefix | Caption | Sub |
  |---|---|---|---|---|---|
  | free | white | 1.5px `brand/16` | brand / `brand/50` | "Free", brand | — |
  | partly | white | 1.5px **dashed** `brand/45` | brand | free half ("Afternoon") | other half ("AM: Dominik H.") |
  | mine | `--bg-mine` | 1.5px brand | white / white/65 | "You" | check + "08:40" if checked in today; slot name if you hold only one half in Full-day mode |
  | taken | `taken` | 1.5px `taken` | `taken-ink` | avatar + short name "Barbora H." (ink `#404040`) | check + time if checked in today. If two different people: caption "Taken", sub "AM X · PM Y" |
  | held | `lilac-soft/32` | transparent | lilac | star + "Held", `brand-deep` | owner short name (`owner_name` when unclaimed), `brand-deep/70` |
  | ended | transparent | 1.5px dashed `line-strong` | `#b4b6c6` | "–" | — |
  | inactive | as ended | | | "Unavailable" | — |

  "Short name" = first name + surname initial ("Martin M."). Taken and held tiles are disabled; mine and bookable tiles are tappable, as today.
  A half is **bookable for me** only if the seat is free for it **and** I don't already hold another seat that half. If a free or partly-free tile has no half that's bookable for me, render it at 50% opacity and disable it. It keeps its normal look so colleagues' availability is still readable.
- Below the grid: a hint in 13, muted: "Tap a free seat to book it. Seats sit in pairs, two pairs per table."

### 3. Sheets (`Sheet.tsx`)
- **Frame:**
  - Panel: white, `rounded-t-[32px]`, padding 8/20/(40 + safe area), sheet shadow, a 38×5 `line` grabber with 16px below it.
  - Overlay: `brand-deep` at 45%.
  - Enter: `translateY(110%)` → `0` over 320ms `cubic-bezier(.2,.8,.2,1)`, with the overlay fading over 250ms. Keep the reduced-motion override.
- **Seat head** (book and mine sheets):
  - A 62px `--bg-mine` badge, `rounded-[18px]`, brand shadow: "B211" (10/700, white/72) over "06" (26/800).
  - Title "Seat B21106" (21/800) with sub "Today, Mon 2 Nov · Table 2" (14, muted).
  - On the right, a **mini room map**: `bg-surface rounded-[14px] p-2`, the 3 table blocks side by side (6px gap). Each block is 2 rows of 2 cells (9×12px, 3px radius, gaps 2px horizontal and 3px vertical).
  - Mini-map cells:
    - this seat: brand fill plus a 2px `brand/25` ring
    - mine: sky
    - taken: `line`
    - held: `lilac-soft/70`
    - free: white with an inset 1px `line`
- **Book sheet:**
  - 3 slot cards (`grid-cols-3 gap-2`), each `rounded-2xl p-3`, 2px border, stacking a HalfGlyph(16), the label (14/800) and the time range (11.5/600 muted: "06:00–13:00", "13:00–24:00", "06:00–24:00", built from settings).
  - Selected card: `brand` border, `brand/5` bg, brand text. Unselected: `line` border.
  - Unavailable card: opacity 45%. Replace the time with "Taken" (`seats.taken`) when the seat itself isn't free for that slot, or with "You're booked" (`seats.youHave`, CS "Už máte místo") when the seat is free but I already hold another seat for that half.
  - Optional note in a `brand/6` box, 13.5/600 brand: "You already have B21105 for that half day." or "Only the afternoon is free."
  - Rule line (13.5, muted), from settings:
    - one slot: "Check in on the day by 10:00, or the seat is released."
    - Full day: "…by 10:00 (morning) and 14:00 (afternoon)…"
    - walk-in after the deadline: "Booked after the check-in deadline, so it counts as checked in."
    - own seat: "Your seat – no check-in needed."
  - Primary button (56px): "Book full day" / "Book morning" / "Book afternoon". Ghost button: "Close".
- **Mine sheet:** the seat head, then one row per half: `bg-surface rounded-2xl`, min-height 60px. Left: HalfGlyph(14) plus the slot name (15.5/800) over the status (12.5). Right: an "I'm here" button (brand, 40px, `rounded-xl`) and/or a "Cancel" outline button (1.5px accent, accent text). Then "Close".
- **Cancel confirm:** title 21/800, then "B21105 · Thu 5 Nov, morning", a "Yes, cancel" danger button (56px, accent shadow `0 10px 22px rgba(241,46,73,.28)`), and "Keep it" as ghost.
- **Profile:**
  - A 62px `--bg-mine` avatar (21/800 initials) beside the name (20/800) and "Signed in as …".
  - Name input (52px, `rounded-[14px]`) with its hint. The Save button appears only when the value changes.
  - "Language" segmented control on `bg-surface` (active: white with a soft shadow): English / Čeština.
  - "Sign out" outline button.

### 4. My bookings (`MyBookings.tsx`)
- Band: title "My bookings", sub "3 upcoming" (the number of days that have bookings).
- **Tickets**, one per date with bookings, stacked with 14px gaps:
  - Container: `rounded-3xl overflow-hidden`, flex row.
  - Left stub, 78px wide: weekday (11/800, uppercase, +0.08em), date number (36/800), month (12/600), and a "TODAY" / "TOMORROW" chip (10.5/800, pill).
  - Perforation: a 2px dashed `line` divider with 16px vertical margin, plus two 20px `bg-surface` circles centred on it at the top and bottom edges (top −10px, left 68px). The container's `overflow-hidden` turns them into notches.
  - Body (padding 16/14/14/16, gap 10): seat code(s) (20/800) with HalfGlyph(12) and "Full day" / slot (12.5/700, muted) on the right. Then one row per half: slot (14/700) over the status (12.5), with an optional "Cancel" chip (34px, `rounded-[10px]`, 1.5px `brand/25`, brand 13/700). If the halves are on different seats, append " · B211xx" to the slot.
  - Ticket statuses:
    - "Check in by 10:00" (muted)
    - check icon + "Checked in 08:40" (brand)
    - "Your seat – no check-in needed"
    - "Check-in deadline passed" (accent)
    - "Released – no check-in" (accent)
- **Today's ticket while check-in is open:**
  - `--bg-mine` bg, white text; muted text becomes white/70 and the perforation white/28.
  - Accent statuses use `#ffb3bd`. Cancel chips use a white/40 border and white text.
  - Shadow `0 16px 34px rgba(48,0,145,.32)`.
  - A footer separated by a white/18 top border: "Check in by 10:00" (14/800) over "1 h 20 min left" (12.5, white/74), and on the right a white "I'm here" button (44px, brand 15/800, shadow `0 8px 18px rgba(10,0,50,.3)`).
- **Empty state:** a white card with two dashed 44×30 "desk" outlines (`brand/35`), the empty copy, and a "Find a seat" primary button that goes to Book.

### 5. Who's in (`WhoIsIn.tsx`)
- Band: title "Who's in", sub = the long date. Day strip as on Book, without the slot toggle.
- **Summary card** (card-raised, `rounded-3xl`, 2 columns split by a 1px `#eef0f4` rule). Each column has padding 16 and contains:
  - HalfGlyph(12) with "MORNING" (12/800, uppercase, muted)
  - the head count (38/800, brand) with "of 12 seats" (13, muted)
  - a 6×2 grid of 8px squares (3px radius, 4px gap), one per seat in code order: brand = taken, sky = you, `#e3e5ee` = free
- **Sections, Morning then Afternoon:**
  - Header: HalfGlyph(14, brand) and the label (18/800); on the right "8 people" (13.5/600, muted).
  - List: white, `rounded-[22px]`, card shadow. Rows are divided by 1px `#eef0f4`, padding 11/16/11/12.
  - Row content:
    - a 40px avatar with tinted initials (13.5/800). If checked in, an 18px sky badge with a white check and a 2px white ring sits bottom-right at −3px.
    - name (15.5/700), plus a "You" pill (`brand/8`, 11/800)
    - sub (12.5, muted): "Checked in 08:05", "Check in by 10:00" or "Held"
    - on the right a seat chip (`bg-surface`, `rounded-[9px]`, 13/800 brand)
- Empty: white card "Nobody has booked this day yet."

### 6. My seat (`MySeat.tsx`, owners only)
- Band: title "My seat", then a glass card (`bg-white/10 border-white/16 rounded-[20px] p-3.5`): a 56px white tile with a 28px brand star, then the seat code (24/800) over "Semi-fixed seat · held for you" (13.5, white/74).
- Panel:
  - intro text (14.5, `#404040`)
  - column headers: an empty column, then HalfGlyph AM + "MORNING" and HalfGlyph PM + "AFTERNOON" (11.5/800, uppercase, muted)
  - rows: grid `4.75rem 1fr 1fr`, gap 8. The day label is the relative day or weekday (15/800) over the date (12, muted).
- Cells: 54px tall, `rounded-2xl`, padding x 12, 14/700:

  | State | Style |
  |---|---|
  | held | `lilac-soft/32` bg, `brand-deep`, star icon |
  | released | white bg, 1.5px dashed `brand/50`, brand |
  | booked by a colleague | `taken` bg, 22px white avatar + short name |
  | mine | `--bg-mine`, white text, shadow `0 8px 18px rgba(48,0,145,.28)` |
  | ended | transparent, dashed `line-strong`, "–" |

  Tap behaviour is unchanged.
- Hint below (13, muted).

### 7. States
- **Loading:** skeleton blocks in the panel. One 150px `#e9ebf2` card and three 184px `#eceef4` trays, all `rounded-3xl`.
- **Error / offline:** a white card with a 36px `accent/12` circle holding "!" (accent 18/800), the `errors.network` copy (16/600), and a "Try again" outline button (52px, `rounded-2xl`).
- **Toast** (`Toast.tsx`):
  - Position: top `safe-area + 12px`, 14px inset.
  - Look: `rounded-[18px]`, padding 10/10/10/12, 14/700 white. Bg `brand-deep` for info, `accent` for errors. Toast shadow.
  - Leading 26px `white/16` circle: a sky check for info, "!" for errors.
  - Optional trailing "Undo" button (`white/16`, `rounded-xl`).
  - Motion: enter `translateY(-14px) scale(.98)` → none over 300ms `cubic-bezier(.2,.8,.2,1)`. Durations: 2.5s info, 4.5s with Undo, 4s error.

## Interactions & motion
- **Staggered enter:** on tab change, day change and first load, list items animate from `opacity:0; translateY(12px) scale(.98)` to rest. Opacity runs 420ms ease, transform 550ms `cubic-bezier(.2,.8,.2,1)`, with a delay of `index × 32ms`. This applies to seat tiles in room order, tickets, Who's-in rows and My-seat rows. Disable it under `prefers-reduced-motion`.
- **Realtime flash:** when a Realtime change makes a seat in view become taken, give that tile the sky flash ring for 2s with a 700ms box-shadow transition. If the book sheet is open for that seat and half, close it and show the `seat_taken` error toast. This needs the changed `seat_id` passed from `useRealtime` (e.g. a small zustand store or a context with `{seatId, at}`).
- **Press:** `active:scale-[.96–.98]` on tiles, day pills, cards and buttons.
- **Tab switch:** scroll the page container to the top.

## New behaviour (client-side only; log each in `docs/decisions.md`)
1. **Usual seat.** The seat the user booked most often in the last 28 days of their bookings. Ties go to the most recent. For seat owners it's their own seat. One extra query: my bookings with `date >= today − 28`, any status except `cancelled`.
   - **Alternative when the usual seat is taken:** rank the free seats as pair partner (same pair in `roomBlocks`), then same table, then the smallest code distance. Book with the current slot choice. If the usual seat is free for only one half, offer that half.
   - **Undo** calls `cancel_booking` for the ids that were just created.
2. **"I'm here" from the Today card and the ticket footer** calls `check_in` for every booking today whose check-in state is `open` (in practice AM and PM together). Toast: "Checked in · 08:40".
3. **Language switch.** Turn `strings.ts` into `{ en, cs }` with the same shape. Store the choice in `localStorage('bmd.lang')`, defaulting to `navigator.language.startsWith('cs') ? 'cs' : 'en'`. A draft Czech copy is in the prototype's `S.cs` object; have a native speaker review it. In Czech the nav label is the shorter "Moje" while the page title stays "Moje rezervace".

## Copy changes / additions (EN)
- `seats.title` "Seats"
- `seats.youHave` "You're booked"
- `seats.legendHint` "Tap a free seat to book it. Seats sit in pairs, two pairs per table."
- `seats.table(n)` "Table n"
- `seats.freeShort(n)` "n free"
- `seats.freeSeats(n)` "free seat(s)"
- `card.usual` "Your usual seat"
- `card.booked` "You're booked"
- `card.manage` "Manage"
- `card.nextTo` "Right next to it"
- `card.sameTable` "Same table"
- `card.closest` "Closest free seat"
- `card.left` "left"
- `isTaken(code)` "B21105 is taken"
- `youreAt(code)` "You're at B21105"
- `left(h,m)` "1 h 20 min left"
- `checkedInAt(t)` "Checked in 08:40"
- `bookBtn(slot)` "Book full day"
- `onlyFree(slot)` "Only the afternoon is free."
- `alreadyHave(code)` "You already have B21105 for that half day."
- `ruleOne(t)` / `ruleFull(a,b)` / `walkIn` / `ownRule`: see the Book sheet section
- `ms.semiFixed` "Semi-fixed seat · held for you"
- `upcoming(n)` "n upcoming"
- `ofSeats(n)` "of 12 seats"
- `profile.language` "Language"
- `undo` "Undo"

## Sign-in code email
`supabase/templates/magic_link.html` in this bundle replaces the repo file of the same name. Use it for **both** the "Confirm signup" and "Magic Link" templates (decision 2). `email-preview.html` shows it with a sample code.
- Built from tables with inline styles and no images or links, so mail scanners have nothing to follow and nothing to load. It uses Supabase variables `{{ .Token }}` and `{{ .Email }}`.
- **Preheader:** "Your BookMyDesk code is {{ .Token }}…", so the code shows in the phone's notification preview. Together with the word "code" in the body, this lets iOS offer it as one-time-code autofill.
- Layout: a CETIN Blue header (`#300091`) with a white app mark and a red seat; heading "Your sign-in code"; the code 42px bold, letter-spacing 12px, brand colour, in a `#f3f1fb` box with `radius 18`; a security note; a Czech paragraph; a footer reading "Sent to {{ .Email }}".
- Dark mode: a `prefers-color-scheme` block switches to `#14102b` / `#1f1a3d` with white text. Clients that don't support it fall back to the light version.
- Subject (Auth → Email Templates): **"Your BookMyDesk sign-in code"**. Keep `{{ .Token }}` out of the subject, because some clients log subjects.
- Local dev: `supabase/config.toml` → `[auth.email.template.magic_link]` and `confirmation`, with `content_path = "./supabase/templates/magic_link.html"`.

## Assets
- `icons/*.svg`: the same paths as `src/components/icons.tsx` (Desk, Bookmark, People, Star, Check). Keep using the TSX icons.
- `assets/icon.svg` = `public/icon.svg`.
- No new imagery.

## Files in this bundle
- `BookMyDesk v2.dc.html`: the prototype. Its **Tweaks** panel switches the clock (08:40 / 10:20 / 14:30), the seat-owner view, and the Normal / New user / Loading / Offline data states. The "Jump to" chips beside the phone open each screen.
- `support.js`, `ios-frame.jsx`: the prototype runtime and phone frame (do not implement).
- `icons/`, `assets/`: copied from the repo.
- `supabase/templates/magic_link.html`: the styled sign-in code email. `email-preview.html` is the same email with sample values.
