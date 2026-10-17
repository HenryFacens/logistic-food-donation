import { ChartLegend } from './ChartLegend'
import {
  chartColor,
  formatChartValue,
  type ChartDatum,
  type ChartTone,
  type ChartValueFormatter,
} from './chartTypes'
import './dashboard.css'

const width = 640
const height = 260
const paddingX = 28
const paddingY = 24
const gridLines = 4

interface ChartPoint {
  x: number
  y: number
}

const buildCurvePath = (points: ChartPoint[]) => {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index]
    const horizontalDistance = point.x - previous.x
    const controlOneX = previous.x + horizontalDistance / 3
    const controlTwoX = point.x - horizontalDistance / 3

    return `${path} C ${controlOneX} ${previous.y}, ${controlTwoX} ${point.y}, ${point.x} ${point.y}`
  }, `M ${points[0].x} ${points[0].y}`)
}

export interface LineChartProps {
  ariaLabel: string
  color?: string
  data: readonly ChartDatum[]
  tone?: ChartTone
  valueFormatter?: ChartValueFormatter
}

export function LineChart({
  ariaLabel,
  color,
  data,
  tone = 'primary',
  valueFormatter = formatChartValue,
}: LineChartProps) {
  const values = data.map((datum) => datum.value)
  const rawMinimum = values.length > 0 ? Math.min(...values) : 0
  const rawMaximum = values.length > 0 ? Math.max(...values) : 0
  const spread = rawMaximum - rawMinimum
  const verticalPadding = spread === 0 ? Math.max(Math.abs(rawMaximum) * 0.1, 1) : spread * 0.08
  const minimum = rawMinimum - verticalPadding
  const maximum = rawMaximum + verticalPadding
  const range = maximum - minimum || 1
  const plotWidth = width - paddingX * 2
  const plotHeight = height - paddingY * 2
  const points = data.map((datum, index) => ({
    x:
      data.length <= 1
        ? width / 2
        : paddingX + (index / (data.length - 1)) * plotWidth,
    y: paddingY + ((maximum - datum.value) / range) * plotHeight,
  }))
  const curvePath = buildCurvePath(points)
  const lineColor = color || chartColor({ tone })

  return (
    <figure
      aria-label={ariaLabel}
      className="dashboard-line-chart dashboard-chart"
    >
      <svg
        aria-hidden="true"
        className="dashboard-line-chart__svg"
        preserveAspectRatio="none"
        viewBox={`0 0 ${width} ${height}`}
      >
        {Array.from({ length: gridLines + 1 }, (_, index) => {
          const y = paddingY + (index / gridLines) * plotHeight

          return (
            <line
              className="dashboard-line-chart__grid"
              key={y}
              x1={paddingX}
              x2={width - paddingX}
              y1={y}
              y2={y}
            />
          )
        })}
        {curvePath ? (
          <path
            className="dashboard-line-chart__curve"
            d={curvePath}
            stroke={lineColor}
          />
        ) : null}
        {points.map((point, index) => (
          <circle
            className="dashboard-line-chart__point"
            cx={point.x}
            cy={point.y}
            fill={chartColor(data[index], tone)}
            key={`${data[index].label}-${index}`}
            r="5"
          />
        ))}
      </svg>

      <ChartLegend
        data={data}
        fallbackTone={tone}
        valueFormatter={valueFormatter}
      />
    </figure>
  )
}
