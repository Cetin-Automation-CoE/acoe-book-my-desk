import { describe, expect, it } from 'vitest'
import { outOfOffice } from './team'

const team = [
  { userIds: ['ann-work', 'ann-home'], name: 'Ann Archer', avatar: null },
  { userIds: ['bob'], name: 'Bob Brown', avatar: 'https://example.com/b.jpg' },
  { userIds: [], name: 'Cy Cole', avatar: null },
  { userIds: ['dee'], name: 'Dee Dale', avatar: null },
]
const names = (members: { name: string }[]) => members.map((m) => m.name)

describe('outOfOffice', () => {
  it('is everyone on the team who is not in', () => {
    expect(names(outOfOffice(team, ['bob'], ['Bob Brown']))).toEqual(['Ann Archer', 'Cy Cole', 'Dee Dale'])
  })

  it('counts a person as in when any of their accounts booked', () => {
    expect(names(outOfOffice(team, ['ann-home'], []))).not.toContain('Ann Archer')
  })

  it('counts a seat owner without an account as in by the held seat name', () => {
    expect(names(outOfOffice(team, [], ['Cy Cole']))).not.toContain('Cy Cole')
  })

  it('is the whole team, by name, when nobody is in', () => {
    expect(names(outOfOffice([...team].reverse(), [], []))).toEqual(['Ann Archer', 'Bob Brown', 'Cy Cole', 'Dee Dale'])
  })

  it('is empty when everyone is in', () => {
    expect(outOfOffice(team, ['ann-work', 'bob', 'dee'], ['Cy Cole'])).toEqual([])
  })
})
