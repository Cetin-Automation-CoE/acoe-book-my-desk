// All user-facing text, in English and Czech, with one shape. Components read the current language
// through useT(); helpers outside React use getStrings(). The choice lives in localStorage('bmd.lang').

import type { BadgeKey } from './lib/progress'

export type Lang = 'en' | 'cs'

const colleagues = (n: number) => `${n} ${n === 1 ? 'colleague' : 'colleagues'}`
const kolegove = (n: number) => `${n} ${n === 1 ? 'kolega' : n >= 2 && n <= 4 ? 'kolegové' : 'kolegů'}`
const czPlural = (n: number, one: string, few: string, many: string) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many)

export const en = {
  appName: 'BookMyDesk',
  tagline: 'Book a seat in the office',
  loading: 'Loading…',
  retry: 'Try again',
  close: 'Close',
  undo: 'Undo',
  you: 'You',

  nav: {
    book: 'Book',
    myBookings: 'My bookings',
    whoIsIn: "Who's in",
    mySeat: 'My seat',
    label: 'Main navigation',
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
  },

  days: {
    today: 'Today',
    tomorrow: 'Tomorrow',
    pick: 'Day',
    thisWeek: 'This week',
    nextWeek: 'Next week',
    weekPrev: 'Previous week',
    weekNext: 'Next week',
  },

  seats: {
    title: 'Seats',
    free: 'Free',
    mine: 'Mine',
    taken: 'Taken',
    held: 'Held',
    inactive: 'Unavailable',
    bookTitle: (code: string) => `Seat ${code}`,
    book: 'Book',
    restOfDay: 'Rest of today',
    booking: 'Booking…',
    booked: 'Booked.',
    legend: 'Tap a free seat to book it. Seats sit in pairs, two pairs per table.',
    ownerLegend: 'Your seat is held for you; as its owner you book that seat only.',
    colleaguesIn: (n: number, when: string) => `${colleagues(n)} in ${when}.`,
    noSeats: 'No seats are set up yet.',
    table: (n: number) => `Table ${n}`,
    freeShort: (n: number) => `${n} free`,
    freeSeats: (n: number): string => (n === 1 ? 'free seat' : 'free seats'),
    cancelRule: (t: string) => `You can cancel until the day starts at ${t}.`,
    startedRule: 'The day is under way – a booking made now cannot be cancelled.',
  },

  card: {
    usual: 'Your usual seat',
    favourite: 'Your favourite seat',
    booked: "You're booked",
    manage: 'Manage',
    nextTo: 'Right next to it',
    sameTable: 'Same table',
    closest: 'Closest free seat',
    isTaken: (code: string) => `${code} is taken`,
  },

  favourite: {
    make: 'Make it my favourite',
    is: 'Your favourite seat',
    remove: 'Remove',
    saved: (code: string) => `${code} is your favourite now.`,
    removed: 'Favourite removed.',
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
    cancelUntilStart: 'Cancel any time before it starts',
    underway: 'Under way',
    cancelled: 'Cancelled',
  },

  whoIsIn: {
    title: "Who's in",
    empty: 'Nobody has booked this day yet.',
    people: (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`,
    ofSeats: (n: number) => `of ${n} seats`,
    held: 'Held',
    ownSeat: 'Semi-fixed seat',
    out: 'Out of office',
  },

  lunch: {
    label: 'Lunch',
    box: 'Lunchbox',
    out: 'Going out',
    mine: 'Your lunch',
    hint: 'Let colleagues know whether you bring a lunchbox or go out for lunch.',
    hasBox: 'Has a lunchbox',
    goesOut: 'Going out for lunch',
    counts: (out: number, box: number) => `${out} going out, ${box} with a lunchbox`,
  },

  mySeat: {
    title: 'My seat',
    semiFixed: 'Semi-fixed seat · held for you',
    intro: (code: string) => `You hold seat ${code}. Release the days you will not come so colleagues can book them.`,
    notOwner: 'You do not hold a seat. Seat owners are assigned by an admin.',
    held: 'Held',
    released: 'Released',
    release: 'Release',
    hint: 'Tap a held day to release it, or a released one to take it back. Releasing cancels your own booking for that day.',
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
    addPhoto: 'Add photo',
    changePhoto: 'Change photo',
    removePhoto: 'Remove',
    uploading: 'Uploading…',
    photoSaved: 'Photo saved.',
    photoRemoved: 'Photo removed.',
    photoFailed: 'That photo could not be used. Try a JPEG or PNG.',
  },

  notifications: {
    title: 'Notifications',
    device: 'On this device',
    deviceHint: 'Allow once; you can switch each kind below.',
    tomorrow: 'Evening reminder',
    tomorrowHint: 'The day before a booking, around 17:00.',
    monday: 'Monday nudge',
    mondayHint: 'When you have nothing booked for the week yet.',
    unsupported: 'This browser cannot show notifications.',
    install: 'Add BookMyDesk to your Home Screen first — iPhones only deliver notifications to installed apps.',
    denied: 'Notifications are blocked for this site in your browser settings.',
    enabled: 'Notifications on.',
    disabled: 'Notifications off on this device.',
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
    on_a_roll: { name: 'On a roll', rule: 'Office days 4 weeks in a row' },
    full_week: { name: 'Full week', rule: 'In the office every working day of a week' },
  } satisfies Record<BadgeKey, { name: string; rule: string }>,


  errors: {
    not_authenticated: 'You are signed out. Sign in again.',
    invalid_slot: 'Pick a morning or afternoon slot.',
    outside_window: 'That date is outside the booking window.',
    not_working_day: 'Seats can only be booked on working days.',
    slot_ended: 'The day has moved on. Pick the seat again.',
    seat_not_found: 'That seat does not exist.',
    seat_inactive: 'That seat is not available.',
    seat_held: 'That seat is held by its owner.',
    owner_own_seat_only: 'As a seat owner you book your own seat only.',
    seat_taken: 'Someone just took that seat.',
    user_already_booked: 'You already have a seat for that day.',
    weekly_limit: 'You have reached the weekly booking limit.',
    booking_not_found: 'That booking no longer exists.',
    not_your_booking: 'That is not your booking.',
    booking_not_active: 'That booking is no longer active.',
    cannot_cancel: 'That booking can no longer be cancelled.',
    not_seat_owner: 'You do not hold that seat.',
    seat_booked_by_other: 'A colleague already booked that day.',
    network: 'Cannot reach the server. Check your connection.',
    unknown: 'Something went wrong. Try again.',
  },
}

export type Strings = typeof en
export type ErrorCode = keyof Strings['errors']

// Draft Czech copy from the design hand-off, completed for the newer screens. Needs a native review.
export const cs: Strings = {
  appName: 'BookMyDesk',
  tagline: 'Rezervace místa v kanceláři',
  loading: 'Načítám…',
  retry: 'Zkusit znovu',
  close: 'Zavřít',
  undo: 'Zpět',
  you: 'Vy',

  nav: {
    book: 'Rezervace',
    myBookings: 'Moje',
    whoIsIn: 'Kdo je tu',
    mySeat: 'Moje místo',
    label: 'Hlavní navigace',
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
  },

  days: {
    today: 'Dnes',
    tomorrow: 'Zítra',
    pick: 'Den',
    thisWeek: 'Tento týden',
    nextWeek: 'Příští týden',
    weekPrev: 'Předchozí týden',
    weekNext: 'Další týden',
  },

  seats: {
    title: 'Místa',
    free: 'Volno',
    mine: 'Moje',
    taken: 'Obsazeno',
    held: 'Drženo',
    inactive: 'Nedostupné',
    bookTitle: (code: string) => `Místo ${code}`,
    book: 'Rezervovat',
    restOfDay: 'Zbytek dne',
    booking: 'Rezervuji…',
    booked: 'Zarezervováno.',
    legend: 'Klepnutím na volné místo ho zarezervujete. Místa jsou v párech, dva páry u stolu.',
    ownerLegend: 'Vaše místo je pro vás držené; jako majitel rezervujete jen to.',
    colleaguesIn: (n: number, when: string) => `${kolegove(n)} ${when}.`,
    noSeats: 'Zatím nejsou nastavená žádná místa.',
    table: (n: number) => `Stůl ${n}`,
    freeShort: (n: number) => `${n} volno`,
    freeSeats: (n: number) => czPlural(n, 'volné místo', 'volná místa', 'volných míst'),
    cancelRule: (t: string) => `Zrušit lze až do začátku dne v ${t}.`,
    startedRule: 'Den už probíhá – rezervaci teď už nepůjde zrušit.',
  },

  card: {
    usual: 'Vaše místo',
    favourite: 'Vaše oblíbené místo',
    booked: 'Rezervováno',
    manage: 'Spravovat',
    nextTo: 'Hned vedle',
    sameTable: 'Stejný stůl',
    closest: 'Nejbližší volné místo',
    isTaken: (code: string) => `${code} je obsazené`,
  },

  favourite: {
    make: 'Nastavit jako oblíbené',
    is: 'Vaše oblíbené místo',
    remove: 'Odebrat',
    saved: (code: string) => `${code} je teď vaše oblíbené místo.`,
    removed: 'Oblíbené místo odebráno.',
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
    cancelUntilStart: 'Zrušit lze kdykoli před začátkem',
    underway: 'Probíhá',
    cancelled: 'Zrušeno',
  },

  whoIsIn: {
    title: 'Kdo je tu',
    empty: 'Na tento den zatím nikdo nemá rezervaci.',
    people: (n: number) => `${n} ${czPlural(n, 'osoba', 'osoby', 'osob')}`,
    ofSeats: (n: number) => `z ${n} míst`,
    held: 'Drženo',
    ownSeat: 'Polofixní místo',
    out: 'Mimo kancelář',
  },

  lunch: {
    label: 'Oběd',
    box: 'Krabička',
    out: 'Jdu ven',
    mine: 'Váš oběd',
    hint: 'Dejte kolegům vědět, jestli máte krabičku, nebo jdete na oběd ven.',
    hasBox: 'Má krabičku',
    goesOut: 'Jde ven',
    counts: (out: number, box: number) => `${out} ${czPlural(out, 'jde', 'jdou', 'jde')} ven, ${box} s krabičkou`,
  },

  mySeat: {
    title: 'Moje místo',
    semiFixed: 'Polofixní místo · drženo pro vás',
    intro: (code: string) => `Držíte místo ${code}. Uvolněte dny, kdy nepřijdete, ať si je mohou zarezervovat kolegové.`,
    notOwner: 'Nedržíte žádné místo. Majitele míst přiřazuje administrátor.',
    held: 'Drženo',
    released: 'Uvolněno',
    release: 'Uvolnit',
    hint: 'Klepnutím na držený den ho uvolníte, na uvolněný ho vezmete zpět. Uvolněním zrušíte svou rezervaci na ten den.',
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
    addPhoto: 'Přidat fotku',
    changePhoto: 'Změnit fotku',
    removePhoto: 'Odebrat',
    uploading: 'Nahrávám…',
    photoSaved: 'Fotka uložena.',
    photoRemoved: 'Fotka odebrána.',
    photoFailed: 'Tuto fotku nelze použít. Zkuste JPEG nebo PNG.',
  },

  notifications: {
    title: 'Oznámení',
    device: 'Na tomto zařízení',
    deviceHint: 'Povolte jednou; jednotlivé druhy nastavíte níže.',
    tomorrow: 'Večerní připomínka',
    tomorrowHint: 'Den před rezervací, kolem 17:00.',
    monday: 'Pondělní pošťouchnutí',
    mondayHint: 'Když na tento týden ještě nic nemáte.',
    unsupported: 'Tento prohlížeč neumí zobrazit oznámení.',
    install: 'Nejdřív přidejte BookMyDesk na plochu – iPhone doručuje oznámení jen nainstalovaným aplikacím.',
    denied: 'Oznámení pro tento web jsou v nastavení prohlížeče zablokovaná.',
    enabled: 'Oznámení zapnuta.',
    disabled: 'Oznámení na tomto zařízení vypnuta.',
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
    on_a_roll: { name: 'V tempu', rule: 'V kanceláři 4 týdny v řadě' },
    full_week: { name: 'Celý týden', rule: 'V kanceláři každý pracovní den týdne' },
  },


  errors: {
    not_authenticated: 'Jste odhlášeni. Přihlaste se znovu.',
    invalid_slot: 'Vyberte dopoledne nebo odpoledne.',
    outside_window: 'Toto datum je mimo rezervační okno.',
    not_working_day: 'Místa lze rezervovat jen na pracovní dny.',
    slot_ended: 'Den už pokročil. Vyberte místo znovu.',
    seat_not_found: 'Toto místo neexistuje.',
    seat_inactive: 'Toto místo není dostupné.',
    seat_held: 'Místo drží jeho majitel.',
    owner_own_seat_only: 'Jako majitel místa rezervujete jen svoje místo.',
    seat_taken: 'Někdo vám to místo právě vzal.',
    user_already_booked: 'Na tento den už místo máte.',
    weekly_limit: 'Dosáhli jste týdenního limitu rezervací.',
    booking_not_found: 'Tato rezervace už neexistuje.',
    not_your_booking: 'To není vaše rezervace.',
    booking_not_active: 'Tato rezervace už není aktivní.',
    cannot_cancel: 'Tuto rezervaci už nelze zrušit.',
    not_seat_owner: 'Toto místo nedržíte.',
    seat_booked_by_other: 'Tento den si už zarezervoval kolega.',
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
