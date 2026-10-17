import type { PickupItem } from '@resgata/shared'
import { formatQuantity } from '../viewModels'

/** Itemized load: "Bananas ........ 12 kg". */
export function PickupItems({ items }: { items: readonly PickupItem[] }) {
  return (
    <ul className="delivery-items" aria-label="Itens da doação">
      {items.map((item, index) => (
        <li key={`${index}-${item.name}-${item.unit}`}>
          <span>{item.name}</span>
          <span className="metric-value">{formatQuantity(item.quantity, item.unit)}</span>
        </li>
      ))}
    </ul>
  )
}
