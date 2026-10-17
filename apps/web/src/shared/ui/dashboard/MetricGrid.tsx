import type { DashboardMetric } from '@resgata/shared'
import { MetricCard } from './MetricCard'
import './dashboard.css'

export interface MetricGridProps {
  ariaLabel?: string
  metrics: DashboardMetric[]
}

export function MetricGrid({
  ariaLabel = 'Indicadores',
  metrics,
}: MetricGridProps) {
  return (
    <ul className="dashboard-metric-grid" aria-label={ariaLabel}>
      {metrics.map((metric) => (
        <li key={metric.key}>
          <MetricCard metric={metric} />
        </li>
      ))}
    </ul>
  )
}
