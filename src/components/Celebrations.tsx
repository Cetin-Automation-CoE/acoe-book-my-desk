import { useState } from 'react'
import { useT } from '../hooks/useLang'
import { celebrateBooking, celebrationsOn, setCelebrations } from '../lib/delight'
import { Row, Switch } from './SettingRow'

// The "Celebrations" block of the profile sheet: confetti and a buzz, on or off for this device.
// Switching it on plays a sample.
export function Celebrations() {
  const t = useT()
  const [on, setOn] = useState(celebrationsOn)
  const change = (next: boolean) => {
    setCelebrations(next)
    setOn(next)
    if (next) celebrateBooking()
  }
  return (
    <section className="flex flex-col gap-1.5" aria-labelledby="celebrations-heading">
      <h2 id="celebrations-heading" className="text-[13px] font-bold">
        {t.celebrations.title}
      </h2>
      <div className="rounded-2xl bg-surface px-3.5">
        <Row label={t.celebrations.label} hint={t.celebrations.hint}>
          <Switch label={t.celebrations.label} checked={on} onChange={change} />
        </Row>
      </div>
    </section>
  )
}
