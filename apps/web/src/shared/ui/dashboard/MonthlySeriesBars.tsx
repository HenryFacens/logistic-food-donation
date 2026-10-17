import type { MonthlyMetricSeries } from '@resgata/shared'
import { useId } from 'react'
import { evidencePresentation } from './evidence'
import { formatDashboardMonth, formatDashboardValue } from './formatters'
import './dashboard.css'

export interface MonthlySeriesBarsProps {
  series: MonthlyMetricSeries
}

export function MonthlySeriesBars({ series }: MonthlySeriesBarsProps) {
  const generatedId = useId()
  const titleId = `${generatedId}-title`
  const detailId = series.detail ? `${generatedId}-detail` : undefined
  const presentation = evidencePresentation[series.evidence]
  const maximum = Math.max(
    ...series.points
      .filter((point) => point.value !== null)
      .map((point) => Math.abs(point.value || 0)),
    0,
  )

  return (
    <article
      className="dashboard-monthly-series"
      aria-describedby={detailId}
      aria-labelledby={titleId}
      data-evidence={series.evidence}
    >
      <div className="dashboard-monthly-series__heading">
        <h3 id={titleId}>{series.label}</h3>
        <span
          className="dashboard-evidence-badge"
          data-evidence={series.evidence}
          title={presentation.description}
        >
          {presentation.label}
        </span>
      </div>

      {series.detail ? (
        <p className="dashboard-monthly-series__detail" id={detailId}>
          {series.detail}
        </p>
      ) : null}

      <ul className="dashboard-monthly-series__list">
        {series.points.map((point) => {
          const formattedMonth = formatDashboardMonth(point.month)
          const formattedValue = formatDashboardValue(point.value, series.unit)
          const width =
            point.value === null || maximum === 0
              ? 0
              : (Math.abs(point.value) / maximum) * 100

          return (
            <li className="dashboard-monthly-series__item" key={point.month}>
              <span className="dashboard-monthly-series__month">
                {formattedMonth}
              </span>
              <span className="dashboard-monthly-series__track" aria-hidden="true">
                <span
                  className="dashboard-monthly-series__bar"
                  style={{ width: `${width}%` }}
                />
              </span>
              <strong className="dashboard-monthly-series__value">
                {formattedValue}
              </strong>
            </li>
          )
        })}
      </ul>
    </article>
  )
}
