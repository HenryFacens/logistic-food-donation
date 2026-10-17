import type { CSSProperties } from 'react'

export type ChartTone =
  | 'danger'
  | 'info'
  | 'muted'
  | 'primary'
  | 'success'
  | 'warning'

export interface ChartDatum {
  color?: string
  label: string
  tone?: ChartTone
  value: number
}

export type ChartValueFormatter = (value: number) => string

const toneColors: Record<ChartTone, string> = {
  danger: 'rgb(var(--color-danger))',
  info: 'rgb(var(--color-info))',
  muted: 'rgb(var(--color-muted))',
  primary: 'rgb(var(--color-primary))',
  success: 'rgb(var(--color-success))',
  warning: 'rgb(var(--color-warning))',
}

const defaultValueFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
})

export const formatChartValue: ChartValueFormatter = (value) =>
  defaultValueFormatter.format(value)

export const chartColor = (
  datum: Pick<ChartDatum, 'color' | 'tone'>,
  fallbackTone: ChartTone = 'primary',
) => datum.color || toneColors[datum.tone || fallbackTone]

export const chartColorStyle = (
  datum: Pick<ChartDatum, 'color' | 'tone'>,
  fallbackTone?: ChartTone,
) =>
  ({
    '--dashboard-chart-color': chartColor(datum, fallbackTone),
  }) as CSSProperties
