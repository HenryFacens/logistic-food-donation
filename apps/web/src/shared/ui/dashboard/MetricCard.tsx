import type { DashboardMetric } from '@resgata/shared'
import { useId, type HTMLAttributes } from 'react'
import { evidencePresentation } from './evidence'
import { formatDashboardValue } from './formatters'
import './dashboard.css'

export interface MetricCardProps extends HTMLAttributes<HTMLElement> {
  metric: DashboardMetric
}

export function MetricCard({ metric, ...props }: MetricCardProps) {
  const generatedId = useId()
  const labelId = `${generatedId}-label`
  const valueId = `${generatedId}-value`
  const evidenceId = `${generatedId}-evidence`
  const detailId = metric.detail ? `${generatedId}-detail` : undefined
  const presentation = evidencePresentation[metric.evidence]
  const describedBy = [valueId, evidenceId, detailId].filter(Boolean).join(' ')

  return (
    <article
      {...props}
      className={[
        'dashboard-metric-card',
        props.className,
      ].filter(Boolean).join(' ')}
      aria-describedby={describedBy}
      aria-labelledby={labelId}
      data-evidence={metric.evidence}
    >
      <div className="dashboard-metric-card__heading">
        <h3 className="dashboard-metric-card__label" id={labelId}>
          {metric.label}
        </h3>
        <span
          className="dashboard-evidence-badge"
          data-evidence={metric.evidence}
          id={evidenceId}
          title={presentation.description}
        >
          {presentation.label}
        </span>
      </div>

      <p className="dashboard-metric-card__value" id={valueId}>
        {formatDashboardValue(metric.value, metric.unit)}
      </p>

      {metric.detail ? (
        <p className="dashboard-metric-card__detail" id={detailId}>
          {metric.detail}
        </p>
      ) : null}
    </article>
  )
}
