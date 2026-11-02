// Names and avatars.

export function initialsOf(name: string): string {
  const parts = (name || '?').trim().split(/\s+/)
  return parts
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// "Martin Minarovič" → "Martin M."
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0]
}

const TINTS = ['rgba(65,182,230,.22)', 'rgba(167,164,224,.5)', 'rgba(241,46,73,.13)', 'rgba(111,121,189,.26)']

// A stable tint per person; the hash keeps the same colour across sessions and screens.
export function avatarTint(userId: string): string {
  let h = 0
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0
  return TINTS[h % TINTS.length]
}

// Seat code "B21105" → { prefix: "B211", digits: "05" }
export function splitCode(code: string): { prefix: string; digits: string } {
  const m = /^(.*?)(\d{1,2})$/.exec(code)
  return m ? { prefix: m[1], digits: m[2] } : { prefix: '', digits: code }
}
