import { avatarTint, initialsOf } from '../lib/people'

interface AvatarProps {
  userId: string
  name: string
  src?: string | null
  // The current user is always solid brand with white initials (when they have no photo).
  me?: boolean
  size?: number
  className?: string
}

export function Avatar({ userId, name, src, me = false, size = 40, className = '' }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }
  const fontSize = Math.round(size * 0.34)
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full font-extrabold ${me ? 'bg-brand text-white' : 'text-brand-deep'} ${className}`}
      style={{ width: size, height: size, fontSize, background: me ? undefined : avatarTint(userId) }}
    >
      {initialsOf(name)}
    </span>
  )
}
