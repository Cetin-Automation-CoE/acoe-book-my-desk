// All user-facing text lives here so a Czech version can be added as a second object later.

import type { BadgeKey } from './lib/progress'

const colleagues = (n: number) => `${n} ${n === 1 ? 'colleague' : 'colleagues'}`

export const strings = {
  appName: 'BookMyDesk',
  tagline: 'Book a seat in the open space',
  loading: 'Loading…',
  retry: 'Try again',
  close: 'Close',
  back: 'Back',

  nav: {
    book: 'Book',
    myBookings: 'My bookings',
    whoIsIn: "Who's in",
    mySeat: 'My seat',
  },

  config: {
    missing: 'The app is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and rebuild.',
  },

  auth: {
    title: 'Sign in',
    intro: 'Use your work email, or the personal address an admin registered for you. We will email you a one-time code.',
    emailLabel: 'Email',
    emailPlaceholder: 'name@cetin.cz',
    sendCode: 'Send code',
    sending: 'Sending…',
    codeSentTo: (email: string) => `We sent a code to ${email}. It can take a minute to arrive.`,
    codeLabel: 'Code from the email',
    verify: 'Sign in',
    verifying: 'Checking…',
    resend: 'Send a new code',
    changeEmail: 'Use a different email',
    signOut: 'Sign out',
    invalidEmail: 'Enter a valid email address.',
    addressNotAllowed:
      'This address is not registered for BookMyDesk. Use your @cetin.cz address, or ask an admin to add this one.',
    invalidCode: 'That code is not valid or has expired. Request a new one.',
    rateLimited: 'Too many attempts. Wait a moment and try again.',
  },

  slots: {
    AM: 'Morning',
    PM: 'Afternoon',
    FULL: 'Full day',
    short: { AM: 'AM', PM: 'PM' },
  },

  days: {
    today: 'Today',
    tomorrow: 'Tomorrow',
  },

  seats: {
    free: 'Free',
    mine: 'Mine',
    taken: 'Taken',
    held: 'Held',
    inactive: 'Unavailable',
    partlyFree: 'Half free',
    heldBy: (name: string) => `Held by ${name}`,
    bookPrompt: (code: string, when: string) => `Book seat ${code} for ${when}?`,
    book: 'Book',
    booking: 'Booking…',
    booked: 'Booked.',
    legend: 'Tap a free seat to book it.',
    noSeats: 'No seats are set up yet.',
  },

  myBookings: {
    title: 'My bookings',
    empty: 'No upcoming bookings. Pick a seat on the Book tab.',
    cancel: 'Cancel',
    cancelling: 'Cancelling…',
    confirmCancel: 'Cancel this booking?',
    keep: 'Keep it',
    yesCancel: 'Yes, cancel',
    checkIn: "I'm here",
    checkingIn: 'Checking in…',
    checkedIn: 'Checked in',
    checkInBy: (time: string) => `Check in by ${time}`,
    checkInOpensOnDay: 'Check in on the day',
    checkInMissed: 'Check-in deadline passed',
    ownerNoCheckIn: 'Your seat – no check-in needed',
    cancelled: 'Cancelled',
    released: 'Released – no check-in',
  },

  whoIsIn: {
    title: "Who's in",
    empty: 'Nobody has booked this day yet.',
    people: (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`,
  },

  mySeat: {
    title: 'My seat',
    intro: (code: string) =>
      `You hold seat ${code}. Release the half days you will not use so colleagues can book them.`,
    notOwner: 'You do not hold a seat. Seat owners are assigned by an admin.',
    held: 'Held',
    released: 'Released',
    bookedBy: (name: string) => `Booked by ${name}`,
    release: 'Release',
    takeBack: 'Take back',
    working: 'Saving…',
    hint: 'Tap a held half day to release it, or a released one to take it back. Releasing cancels your own booking for that half day.',
  },

  progress: {
    title: 'Your office days',
    streak: 'week streak',
    best: 'best streak',
    days: (n: number) => (n === 1 ? 'office day' : 'office days'),
    start: 'Every day with a booking counts, once it starts. Book a seat to begin your streak.',
    badges: (earned: number, total: number) => `Badges · ${earned} of ${total}`,
    newBadge: (name: string) => `New badge: ${name}`,
  },

  badges: {
    first_day: { name: 'First day in', rule: 'Your first office day' },
    regular: { name: 'Regular', rule: '10 office days' },
    resident: { name: 'Resident', rule: '50 office days' },
    explorer: { name: 'Explorer', rule: 'Sit in 6 different seats' },
    full_house: { name: 'Full house', rule: 'Be in when every seat is taken' },
    team_day: { name: 'Team day', rule: 'Be in on a team day' },
    on_a_roll: { name: 'On a roll', rule: 'Office days 4 weeks in a row' },
    full_week: { name: 'Full week', rule: 'In the office every working day of a week' },
  } satisfies Record<BadgeKey, { name: string; rule: string }>,

  teamDay: {
    here: (n: number) => (n === 0 ? 'Team day.' : `Team day – ${colleagues(n)} are in.`),
    join: (when: string, n: number) => `${when} is a team day – ${colleagues(n)} in.`,
    show: 'Show',
    some: (n: number, when: string) => `${colleagues(n)} in ${when}.`,
    whoIsIn: (n: number) => `Team day – ${n} people in the office.`,
    legend: 'A blue dot marks a team day.',
  },

  profile: {
    nameLabel: 'Your name',
    nameHint: 'Shown to colleagues on booked seats.',
    save: 'Save',
    saved: 'Saved.',
    signedInAs: (email: string) => `Signed in as ${email}`,
  },

  errors: {
    not_authenticated: 'You are signed out. Sign in again.',
    invalid_slot: 'Pick a morning or afternoon slot.',
    outside_window: 'That date is outside the booking window.',
    not_working_day: 'Seats can only be booked on working days.',
    slot_ended: 'That half day is already over.',
    seat_not_found: 'That seat does not exist.',
    seat_inactive: 'That seat is not available.',
    seat_held: 'That seat is held by its owner.',
    seat_taken: 'Someone just took that seat.',
    user_already_booked: 'You already have a seat for that half day.',
    weekly_limit: 'You have reached the weekly booking limit.',
    booking_not_found: 'That booking no longer exists.',
    not_your_booking: 'That is not your booking.',
    booking_not_active: 'That booking is no longer active.',
    cannot_cancel: 'That booking can no longer be cancelled.',
    checkin_not_today: 'You can check in on the day of your booking.',
    checkin_closed: 'The check-in deadline has passed.',
    not_seat_owner: 'You do not hold that seat.',
    seat_booked_by_other: 'A colleague already booked that half day.',
    network: 'Cannot reach the server. Check your connection.',
    unknown: 'Something went wrong. Try again.',
  },
} as const

export type ErrorCode = keyof typeof strings.errors
