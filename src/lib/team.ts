import type { TeamMember } from './types'

// Out of office on a day: everyone on the team who is not in — neither booked nor holding their
// seat. A person is in when any of their accounts is, or when an in row carries their name (a seat
// owner who has not signed in yet is in by name only, through the held seat's owner_name).
export function outOfOffice(
  team: readonly TeamMember[],
  inUserIds: Iterable<string>,
  inNames: Iterable<string>,
): TeamMember[] {
  const ids = new Set(inUserIds)
  const names = new Set(inNames)
  return team
    .filter((m) => !m.userIds.some((id) => ids.has(id)) && !names.has(m.name))
    .sort((a, b) => a.name.localeCompare(b.name))
}
