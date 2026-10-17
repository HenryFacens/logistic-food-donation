import { useId } from 'react'
import { ChartLegend } from './ChartLegend'
import {
  chartColor,
  formatChartValue,
  type ChartDatum,
  type ChartValueFormatter,
} from './chartTypes'
import './dashboard.css'

const radius = 42
const circumference = 2 * Math.PI * radius

export interface DonutChartProps {
  ariaLabel: string
  centerLabel?: string
  centerValue?: string
  data: readonly ChartDatum[]
  valueFormatter?: ChartValueFormatter
}

export function DonutChart({
  ariaLabel,
  centerLabel,
  centerValue,
  data,
  valueFormatter = formatChartValue,
}: DonutChartProps) {
  const generatedId = useId()
  const labelId = `${generatedId}-label`
  const total = data.reduce(
    (sum, datum) => sum + Math.max(0, datum.value),
    0,
  )
  let accumulatedLength = 0

  return (
    <figure
      aria-label={ariaLabel}
      className="dashboard-donut-chart dashboard-chart"
    >
      <div className="dashboard-donut-chart__visual">
        <svg
          aria-hidden="true"
          className="dashboard-donut-chart__svg"
          viewBox="0 0 100 100"
        >
          <circle
            className="dashboard-donut-chart__track"
            cx="50"
            cy="50"
            r={radius}
          />
          {total > 0
            ? data.map((datum, index) => {
                const segmentLength =
                  (Math.max(0, datum.value) / total) * circumference
                const dashOffset = -accumulatedLength
                accumulatedLength += segmentLength

                return (
                  <circle
                    className="dashboard-donut-chart__segment"
                    cx="50"
                    cy="50"
                    key={`${datum.label}-${index}`}
                    r={radius}
                    stroke={chartColor(datum)}
                    strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                    strokeDashoffset={dashOffset}
                  />
                )
              })
            : null}
        </svg>

        {centerValue || centerLabel ? (
          <div
            className="dashboard-donut-chart__center"
            id={labelId}
          >
            {centerValue ? <strong>{centerValue}</strong> : null}
            {centerLabel ? <span>{centerLabel}</span> : null}
          </div>
        ) : null}
      </div>

      <ChartLegend data={data} valueFormatter={valueFormatter} />
    </figure>
  )
}
