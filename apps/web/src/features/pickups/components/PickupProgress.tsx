import type { PickupStatus } from '@resgata/shared'
import { AppIcon, type AppIconName } from '../../../shared/ui'

const steps: Array<{ icon: AppIconName; label: string }> = [
  { icon: 'check', label: 'Aceita' },
  { icon: 'package', label: 'Retirada' },
  { icon: 'flag', label: 'Entregue' },
]

const stepIndex = (status: PickupStatus) => {
  if (status === 'assigned' || status === 'en_route_pickup') return 0
  if (status === 'collected' || status === 'en_route_delivery') return 1
  if (status === 'delivered') return 2
  return -1
}

/** Assigned → collected → delivered, with the track filling as it advances. */
export function PickupProgress({ status }: { status: PickupStatus }) {
  const current = stepIndex(status)
  if (current < 0) return null
  const finished = status === 'delivered'
  return (
    <ol
      aria-label={`Etapa ${current + 1} de ${steps.length}: ${steps[current].label}`}
      className="pickup-progress"
      style={{ '--progress': current / (steps.length - 1) } as React.CSSProperties}
    >
      {steps.map((step, index) => (
        <li
          className="pickup-progress__step"
          data-state={
            index < current || finished ? 'done' : index === current ? 'current' : 'todo'
          }
          key={step.label}
        >
          <span className="pickup-progress__dot">
            <AppIcon name={step.icon} size={16} />
          </span>
          <span className="pickup-progress__label">{step.label}</span>
        </li>
      ))}
    </ol>
  )
}
