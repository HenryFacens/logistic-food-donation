import { Card } from '../../../shared/ui'
import { useNearbyNeeds } from '../api/needs'
import { needMessages } from '../messages'
import { formatDeadline, formatKg, needCategoryLabels } from '../model/needs'

/** Seller view: what NGOs near the shop are asking for right now. */
export function NearbyNeedsPanel() {
  const needs = useNearbyNeeds()
  if (!needs.data?.length) return null

  return (
    <Card className="grid gap-3">
      <div>
        <span className="eyebrow">{needMessages.nearbyEyebrow}</span>
        <h2 className="mb-0 text-lg font-extrabold">{needMessages.nearbyTitle}</h2>
      </div>
      <ul className="m-0 grid list-none gap-2 p-0">
        {needs.data.slice(0, 4).map((need) => (
          <li
            className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-control border border-border px-3 py-2"
            key={need.id}
          >
            <span>
              <strong>{needCategoryLabels[need.category]}</strong> ·{' '}
              {formatKg(need.remainingKg)}
            </span>
            <span className="text-sm">
              {need.ngoName?.replace(/\s+SIMULADO$/u, '')}
              {need.distanceKm !== undefined ? ` · ${need.distanceKm} km` : ''} ·{' '}
              {needMessages.until.toLowerCase()} {formatDeadline(need.neededBy)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
