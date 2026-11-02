// All user-facing text, in English and Czech, with one shape. Components read the current language
// through useT(); helpers outside React use getStrings(). The choice lives in localStorage('bmd.lang').

import type { BadgeKey } from './lib/progress'

export type Lang = 'en' | 'cs'

const colleagues = (n: number) => `${n} ${n === 1 ? 'colleague' : 'colleagues'}`
const kolegove = (n: number) => `${n} ${n === 1 ? 'kolega' : n >= 2 && n <= 4 ? 'kolegové' : 'kolegů'}`
const czPlural = (n: number, one: string, few: string, many: string) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many)

export const en = {
  appName: 'BookMyDesk',
  tagline: 'Book a seat in the open space',
  loading: 'Loading…',
  retry: 'Try again',
  close: 'Close',
  back: 'Back',
  undo: 'Undo',
  you: 'You',

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
    resent: 'New code sent.',
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
    title: 'Seats',
    free: 'Free',
    mine: 'Mine',
    taken: 'Taken',
    held: 'Held',
    inactive: 'Unavailable',
    partlyFree: 'Half free',
    youHave: "You're booked",
    heldBy: (name: string) => `Held by ${name}`,
    bookTitle: (code: string) => `Seat ${code}`,
    book: 'Book',
    bookBtn: (slot: string) => `Book ${slot.toLowerCase()}`,
    booking: 'Booking…',
    booked: 'Booked.',
    legend: 'Tap a free seat to book it. Seats sit in pairs, two pairs per table.',
    noSeats: 'No seats are set up yet.',
    table: (n: number) => `Table ${n}`,
    freeShort: (n: number) => `${n} free`,
    freeSeats: (n: number): string => (n === 1 ? 'free seat' : 'free seats'),
    onlyFree: (slot: string) => `Only the ${slot.toLowerCase()} is free.`,
    alreadyHave: (code: string) => `You already have ${code} for that half day.`,
    ruleOne: (t: string) => `Check in on the day by ${t}, or the seat is released.`,
    ruleFull: (a: string, b: string) => `Check in on the day by ${a} (morning) and ${b} (afternoon), or the seat is released.`,
    walkIn: 'Booked after the check-in deadline, so it counts as checked in.',
    ownRule: 'Your seat – no check-in needed.',
    other: (slot: string, who: string) => `${slot}: ${who}`,
  },

  card: {
    usual: 'Your usual seat',
    booked: "You're booked",
    manage: 'Manage',
    nextTo: 'Right next to it',
    sameTable: 'Same table',
    closest: 'Closest free seat',
    left: 'left',
    isTaken: (code: string) => `${code} is taken`,
    youreAt: (code: string) => `You're at ${code}`,
    timeLeft: (h: number, m: number) => `${h ? `${h} h ` : ''}${m} min left`,
    checkedInAt: (t: string) => `Checked in ${t}`,
    checkedInToast: (t: string) => `Checked in · ${t}`,
  },

  myBookings: {
    title: 'My bookings',
    upcoming: (n: number) => `${n} upcoming`,
    empty: 'No upcoming bookings. Pick a seat on the Book tab.',
    findSeat: 'Find a seat',
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
    ofSeats: (n: number) => `of ${n} seats`,
  },

  mySeat: {
    title: 'My seat',
    semiFixed: 'Semi-fixed seat · held for you',
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

  profile: {
    title: 'Profile',
    nameLabel: 'Your name',
    nameHint: 'Shown to colleagues on booked seats.',
    save: 'Save',
    saved: 'Saved.',
    signedInAs: (email: string) => `Signed in as ${email}`,
    language: 'Language',
    languages: { en: 'English', cs: 'Čeština' },
  },

  progress: {
    title: 'Your office days',
    streak: 'week streak',
    best: 'best streak',
    days: (n: number): string => (n === 1 ? 'office day' : 'office days'),
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
    legend: 'A white dot marks a team day.',
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
}

export type Strings = typeof en
export type ErrorCode = keyof Strings['errors']

// Draft Czech copy from the design hand-off, completed for the newer screens. Needs a native review.
export const cs: Strings = {
  appName: 'BookMyDesk',
  tagline: 'Rezervace místa v open space',
  loading: 'Načítám…',
  retry: 'Zkusit znovu',
  close: 'Zavřít',
  back: 'Zpět',
  undo: 'Zpět',
  you: 'Vy',

  nav: {
    book: 'Rezervace',
    myBookings: 'Moje',
    whoIsIn: 'Kdo je tu',
    mySeat: 'Moje místo',
  },

  config: {
    missing: 'Aplikace není nastavená. Nastavte VITE_SUPABASE_URL a VITE_SUPABASE_ANON_KEY a znovu sestavte.',
  },

  auth: {
    title: 'Přihlášení',
    intro: 'Použijte pracovní e-mail, nebo osobní adresu, kterou vám zaregistroval administrátor. Pošleme vám jednorázový kód.',
    emailLabel: 'E-mail',
    emailPlaceholder: 'jmeno@cetin.cz',
    sendCode: 'Poslat kód',
    sending: 'Odesílám…',
    codeSentTo: (email: string) => `Poslali jsme kód na ${email}. Může trvat minutu, než dorazí.`,
    codeLabel: 'Kód z e-mailu',
    verify: 'Přihlásit se',
    verifying: 'Ověřuji…',
    resend: 'Poslat nový kód',
    resent: 'Nový kód odeslán.',
    changeEmail: 'Jiný e-mail',
    signOut: 'Odhlásit se',
    invalidEmail: 'Zadejte platnou e-mailovou adresu.',
    addressNotAllowed:
      'Tato adresa není pro BookMyDesk registrovaná. Použijte adresu @cetin.cz, nebo požádejte administrátora o přidání.',
    invalidCode: 'Kód není platný nebo vypršel. Vyžádejte si nový.',
    rateLimited: 'Příliš mnoho pokusů. Chvíli počkejte a zkuste to znovu.',
  },

  slots: {
    AM: 'Dopoledne',
    PM: 'Odpoledne',
    FULL: 'Celý den',
    short: { AM: 'dop.', PM: 'odp.' },
  },

  days: {
    today: 'Dnes',
    tomorrow: 'Zítra',
  },

  seats: {
    title: 'Místa',
    free: 'Volno',
    mine: 'Moje',
    taken: 'Obsazeno',
    held: 'Drženo',
    inactive: 'Nedostupné',
    partlyFree: 'Napůl volno',
    youHave: 'Už máte místo',
    heldBy: (name: string) => `Drží ${name}`,
    bookTitle: (code: string) => `Místo ${code}`,
    book: 'Rezervovat',
    bookBtn: (slot: string) => `Rezervovat – ${slot.toLowerCase()}`,
    booking: 'Rezervuji…',
    booked: 'Zarezervováno.',
    legend: 'Klepnutím na volné místo ho zarezervujete. Místa jsou v párech, dva páry u stolu.',
    noSeats: 'Zatím nejsou nastavená žádná místa.',
    table: (n: number) => `Stůl ${n}`,
    freeShort: (n: number) => `${n} volno`,
    freeSeats: (n: number) => czPlural(n, 'volné místo', 'volná místa', 'volných míst'),
    onlyFree: (slot: string) => `Volno je jen ${slot.toLowerCase()}.`,
    alreadyHave: (code: string) => `Na tento půlden už máte ${code}.`,
    ruleOne: (t: string) => `Přítomnost potvrďte v den rezervace do ${t}, jinak se místo uvolní.`,
    ruleFull: (a: string, b: string) =>
      `Přítomnost potvrďte v den rezervace do ${a} (dopoledne) a ${b} (odpoledne), jinak se místo uvolní.`,
    walkIn: 'Rezervace po termínu potvrzení se počítá jako potvrzená.',
    ownRule: 'Vaše místo – potvrzení není potřeba.',
    other: (slot: string, who: string) => `${slot}: ${who}`,
  },

  card: {
    usual: 'Vaše obvyklé místo',
    booked: 'Máte rezervaci',
    manage: 'Spravovat',
    nextTo: 'Hned vedle',
    sameTable: 'Stejný stůl',
    closest: 'Nejbližší volné místo',
    left: 'zbývá',
    isTaken: (code: string) => `${code} je obsazené`,
    youreAt: (code: string) => `Sedíte na ${code}`,
    timeLeft: (h: number, m: number) => `zbývá ${h ? `${h} h ` : ''}${m} min`,
    checkedInAt: (t: string) => `Potvrzeno v ${t}`,
    checkedInToast: (t: string) => `Přítomnost potvrzena · ${t}`,
  },

  myBookings: {
    title: 'Moje rezervace',
    upcoming: (n: number) => `${n} ${czPlural(n, 'nadcházející', 'nadcházející', 'nadcházejících')}`,
    empty: 'Žádné nadcházející rezervace. Vyberte místo na kartě Rezervace.',
    findSeat: 'Najít místo',
    cancel: 'Zrušit',
    cancelling: 'Ruším…',
    confirmCancel: 'Zrušit tuto rezervaci?',
    keep: 'Ponechat',
    yesCancel: 'Ano, zrušit',
    checkIn: 'Jsem tu',
    checkingIn: 'Potvrzuji…',
    checkedIn: 'Přítomnost potvrzena',
    checkInBy: (time: string) => `Potvrďte do ${time}`,
    checkInOpensOnDay: 'Potvrďte v den rezervace',
    checkInMissed: 'Termín potvrzení vypršel',
    ownerNoCheckIn: 'Vaše místo – bez potvrzení',
    cancelled: 'Zrušeno',
    released: 'Uvolněno – bez potvrzení',
  },

  whoIsIn: {
    title: 'Kdo je tu',
    empty: 'Na tento den zatím nikdo nemá rezervaci.',
    people: (n: number) => `${n} ${czPlural(n, 'osoba', 'osoby', 'osob')}`,
    ofSeats: (n: number) => `z ${n} míst`,
  },

  mySeat: {
    title: 'Moje místo',
    semiFixed: 'Polofixní místo · drženo pro vás',
    intro: (code: string) => `Držíte místo ${code}. Uvolněte půldny, kdy nepřijdete, ať si je mohou zarezervovat kolegové.`,
    notOwner: 'Nedržíte žádné místo. Majitele míst přiřazuje administrátor.',
    held: 'Drženo',
    released: 'Uvolněno',
    bookedBy: (name: string) => `Rezervoval ${name}`,
    release: 'Uvolnit',
    takeBack: 'Vzít zpět',
    working: 'Ukládám…',
    hint: 'Klepnutím na držený půlden ho uvolníte, na uvolněný ho vezmete zpět. Uvolněním zrušíte svou rezervaci na ten půlden.',
  },

  profile: {
    title: 'Profil',
    nameLabel: 'Vaše jméno',
    nameHint: 'Kolegové ho uvidí u rezervovaných míst.',
    save: 'Uložit',
    saved: 'Uloženo.',
    signedInAs: (email: string) => `Přihlášeno jako ${email}`,
    language: 'Jazyk',
    languages: { en: 'English', cs: 'Čeština' },
  },

  progress: {
    title: 'Vaše dny v kanceláři',
    streak: 'týdnů v řadě',
    best: 'nejdelší řada',
    days: (n: number) => czPlural(n, 'den v kanceláři', 'dny v kanceláři', 'dní v kanceláři'),
    start: 'Počítá se každý den s rezervací, jakmile začne. Zarezervujte si místo a začněte svou řadu.',
    badges: (earned: number, total: number) => `Odznaky · ${earned} z ${total}`,
    newBadge: (name: string) => `Nový odznak: ${name}`,
  },

  badges: {
    first_day: { name: 'První den', rule: 'Váš první den v kanceláři' },
    regular: { name: 'Štamgast', rule: '10 dní v kanceláři' },
    resident: { name: 'Rezident', rule: '50 dní v kanceláři' },
    explorer: { name: 'Průzkumník', rule: 'Seďte na 6 různých místech' },
    full_house: { name: 'Plný dům', rule: 'Buďte tu, když jsou všechna místa obsazená' },
    team_day: { name: 'Týmový den', rule: 'Buďte tu v týmový den' },
    on_a_roll: { name: 'V tempu', rule: 'V kanceláři 4 týdny v řadě' },
    full_week: { name: 'Celý týden', rule: 'V kanceláři každý pracovní den týdne' },
  },

  teamDay: {
    here: (n: number) => (n === 0 ? 'Týmový den.' : `Týmový den – ${kolegove(n)} tu ${n === 1 ? 'je' : 'jsou'}.`),
    join: (when: string, n: number) => `${when} je týmový den – ${kolegove(n)}.`,
    show: 'Zobrazit',
    some: (n: number, when: string) => `${kolegove(n)} ${when}.`,
    whoIsIn: (n: number) => `Týmový den – ${n} lidí v kanceláři.`,
    legend: 'Bílá tečka označuje týmový den.',
  },

  errors: {
    not_authenticated: 'Jste odhlášeni. Přihlaste se znovu.',
    invalid_slot: 'Vyberte dopoledne nebo odpoledne.',
    outside_window: 'Toto datum je mimo rezervační okno.',
    not_working_day: 'Místa lze rezervovat jen na pracovní dny.',
    slot_ended: 'Tento půlden už skončil.',
    seat_not_found: 'Toto místo neexistuje.',
    seat_inactive: 'Toto místo není dostupné.',
    seat_held: 'Místo drží jeho majitel.',
    seat_taken: 'Někdo vám to místo právě vzal.',
    user_already_booked: 'Na tento půlden už místo máte.',
    weekly_limit: 'Dosáhli jste týdenního limitu rezervací.',
    booking_not_found: 'Tato rezervace už neexistuje.',
    not_your_booking: 'To není vaše rezervace.',
    booking_not_active: 'Tato rezervace už není aktivní.',
    cannot_cancel: 'Tuto rezervaci už nelze zrušit.',
    checkin_not_today: 'Přítomnost lze potvrdit v den rezervace.',
    checkin_closed: 'Termín potvrzení vypršel.',
    not_seat_owner: 'Toto místo nedržíte.',
    seat_booked_by_other: 'Tento půlden si už zarezervoval kolega.',
    network: 'Nelze se spojit se serverem. Zkontrolujte připojení.',
    unknown: 'Něco se pokazilo. Zkuste to znovu.',
  },
}

export const dictionaries: Record<Lang, Strings> = { en, cs }
export const LANG_KEY = 'bmd.lang'

export function detectLang(): Lang {
  try {
    const stored = window.localStorage.getItem(LANG_KEY)
    if (stored === 'en' || stored === 'cs') return stored
  } catch {
    // no storage
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('cs') ? 'cs' : 'en'
}

// Module-level current language so non-React helpers (dates, errors) read the same choice.
let current: Lang = typeof window === 'undefined' ? 'en' : detectLang()

export function getLang(): Lang {
  return current
}

export function setLang(lang: Lang) {
  current = lang
  try {
    window.localStorage.setItem(LANG_KEY, lang)
  } catch {
    // no storage
  }
}

export function getStrings(): Strings {
  return dictionaries[current]
}

// Kept for code that renders outside the language provider (configuration error screen).
export const strings = en
