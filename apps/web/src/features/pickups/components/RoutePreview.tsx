import type { Pickup } from '@resgata/shared'
import { SimuladoBadge } from '../../../shared/ui'
import { pickupMessages } from '../messages'

export function RoutePreview({ pickup }: { pickup: Pickup }) {
  return (
    <figure className="route-preview">
      <svg
        aria-label="Representação ilustrativa do trajeto entre retirada e entrega"
        viewBox="0 0 360 142"
      >
        <title>Trajeto ilustrativo entre retirada e entrega</title>
        <path className="route-preview__street" d="M0 35h360M0 106h360M72 0v142M190 0v142M305 0v142" />
        <path className="route-preview__guide" d="M15 118 92 91 151 92 188 61 266 61 342 26" />
        <path className="route-preview__route" d="M41 111 104 83 186 83 186 48 286 48" />
        <circle className="route-preview__origin" cx="41" cy="111" r="9" />
        <circle className="route-preview__driver" cx="104" cy="83" r="7" />
        <circle className="route-preview__destination" cx="286" cy="48" r="9" />
      </svg>
      <figcaption>
        <span>
          <SimuladoBadge />
          {pickupMessages.routeSimulation}
        </span>
        <code>{pickup.id.slice(0, 8)}</code>
      </figcaption>
    </figure>
  )
}
