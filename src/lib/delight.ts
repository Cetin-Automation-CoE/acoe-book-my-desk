// Little celebrations: confetti and a short buzz. All of it is optional sugar. It follows the
// Celebrations switch (per device, in the profile sheet), skips the confetti for people who ask
// their system for reduced motion, and quietly does nothing where the browser cannot (iPhones have
// no vibration API). The rest of the app calls these functions and never the browser APIs.

import type { CreateTypes } from 'canvas-confetti'

const KEY = 'bmd.celebrations'

export function celebrationsOn(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function setCelebrations(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    // Private mode or blocked storage: the switch lasts until the page reloads.
  }
}

export function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

function vibrate(pattern: number | number[]) {
  if (!celebrationsOn()) return
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // Some browsers throw instead of ignoring the call.
  }
}

// A barely-there tap for each hop of the "Surprise me" shuffle.
export const tick = () => vibrate(6)

// Confetti is loaded on first use, so it stays out of the main bundle. It is drawn on its own canvas
// inside #root: on wide screens #root is the phone frame's screen, so the confetti stays in the phone.
let cannon: Promise<CreateTypes> | null = null
function getCannon(): Promise<CreateTypes> {
  cannon ??= import('canvas-confetti').then(({ default: confetti }) => {
    const canvas = document.createElement('canvas')
    canvas.className = 'confetti-canvas'
    canvas.setAttribute('aria-hidden', 'true')
    ;(document.getElementById('root') ?? document.body).appendChild(canvas)
    return confetti.create(canvas, { resize: true, disableForReducedMotion: true })
  })
  return cannon
}

// CETIN Blue, the "mine" violet, red, sky and lilac.
const COLOURS = ['#300091', '#5a33d6', '#f12e49', '#41b6e6', '#a7a4e0']

function burst(fire: (confetti: CreateTypes) => void) {
  if (reducedMotion()) return
  getCannon()
    .then(fire)
    .catch(() => {
      // No confetti is not worth an error.
      cannon = null
    })
}

// A seat is booked: a buzz and a burst from the bottom of the screen.
export function celebrateBooking() {
  if (!celebrationsOn()) return
  vibrate([24, 50, 36])
  burst((confetti) => {
    void confetti({
      particleCount: 90,
      spread: 75,
      startVelocity: 48,
      gravity: 1.1,
      ticks: 180,
      origin: { x: 0.5, y: 1 },
      colors: COLOURS,
      scalar: 0.9,
    })
  })
}

// A new badge: a longer buzz and two side cannons.
export function celebrateBadge() {
  if (!celebrationsOn()) return
  vibrate([30, 60, 30, 60, 60])
  burst((confetti) => {
    for (const side of [0, 1]) {
      void confetti({
        particleCount: 70,
        angle: side === 0 ? 60 : 120,
        spread: 60,
        startVelocity: 55,
        ticks: 220,
        origin: { x: side, y: 0.75 },
        colors: COLOURS,
        scalar: 0.95,
      })
    }
  })
}
