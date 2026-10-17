import type { ChartDatum, ChartTone, ChartValueFormatter } from './chartTypes'
import {
  chartColorStyle,
  formatChartValue,
} from './chartTypes'

interface ChartLegendProps {
  data: readonly ChartDatum[]
  fallbackTone?: ChartTone
  valueFormatter?: ChartValueFormatter
}

export function ChartLegend({
  data,
  fallbackTone,
  valueFormatter = formatChartValue,
}: ChartLegendProps) {
  return (
    <ul className="dashboard-chart-legend">
      {data.map((datum, index) => (
        <li
          className="dashboard-chart-legend__item"
          key={`${datum.label}-${index}`}
        >
          <span
            aria-hidden="true"
            className="dashboard-chart-legend__swatch"
            style={chartColorStyle(datum, fallbackTone)}
          />
          <span className="dashboard-chart-legend__label">{datum.label}</span>
          <strong className="dashboard-chart-legend__value">
            {valueFormatter(datum.value)}
          </strong>
        </li>
      ))}
    </ul>
  )
}
