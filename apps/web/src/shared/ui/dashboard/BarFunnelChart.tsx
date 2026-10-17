import { ChartLegend } from './ChartLegend'
import {
  chartColorStyle,
  formatChartValue,
  type ChartDatum,
  type ChartValueFormatter,
} from './chartTypes'
import './dashboard.css'

export type BarFunnelChartVariant = 'bars' | 'funnel'

export interface BarFunnelChartProps {
  ariaLabel: string
  data: readonly ChartDatum[]
  valueFormatter?: ChartValueFormatter
  variant?: BarFunnelChartVariant
}

export function BarFunnelChart({
  ariaLabel,
  data,
  valueFormatter = formatChartValue,
  variant = 'bars',
}: BarFunnelChartProps) {
  const maximum = Math.max(...data.map((datum) => Math.max(0, datum.value)), 0)

  return (
    <figure
      aria-label={ariaLabel}
      className="dashboard-bar-chart dashboard-chart"
      data-variant={variant}
    >
      <div aria-hidden="true" className="dashboard-bar-chart__plot">
        {data.map((datum, index) => {
          const width =
            maximum === 0 ? 0 : (Math.max(0, datum.value) / maximum) * 100

          return (
            <span
              className="dashboard-bar-chart__track"
              key={`${datum.label}-${index}`}
            >
              <span
                className="dashboard-bar-chart__bar"
                style={{
                  ...chartColorStyle(datum),
                  width: `${width}%`,
                }}
              />
            </span>
          )
        })}
      </div>

      <ChartLegend data={data} valueFormatter={valueFormatter} />
    </figure>
  )
}
