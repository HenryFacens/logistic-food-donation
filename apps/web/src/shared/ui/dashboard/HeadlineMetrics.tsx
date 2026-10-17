import type { DashboardMetric } from '@resgata/shared'
import { evidencePresentation } from './evidence'
import { formatDashboardValue } from './formatters'
import './dashboard.css'

export interface HeadlineMetric {
  /** Missing or null metrics are skipped. */
  metric: DashboardMetric | undefined
  /** Plain-language label shown instead of the API label. */
  label?: string
}

export interface HeadlineMetricsProps {
  ariaLabel: string
  items: readonly HeadlineMetric[]
}

/**
 * The few numbers that matter on a dashboard, each tagged with where it
 * comes from (recorded, calculated, or estimated) so estimates never pass
 * for verified data.
 */
export function HeadlineMetrics({ ariaLabel, items }: HeadlineMetricsProps) {
  const shown = items.flatMap(({ label, metric }) =>
    metric && metric.value !== null ? [{ label, metric }] : [],
  )
  if (!shown.length) return null
  return (
    <ul aria-label={ariaLabel} className="headline-metrics">
      {shown.map(({ label, metric }) => (
        <li className="headline-metric" data-evidence={metric.evidence} key={metric.key}>
          <strong className="headline-metric__value">
            {formatDashboardValue(metric.value, metric.unit)}
          </strong>
          <span className="headline-metric__label">{label ?? metric.label}</span>
          <span
            className="dashboard-evidence-badge"
            data-evidence={metric.evidence}
            title={evidencePresentation[metric.evidence].description}
          >
            {evidencePresentation[metric.evidence].label}
          </span>
        </li>
      ))}
    </ul>
  )
}
