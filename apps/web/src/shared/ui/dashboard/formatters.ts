import type { DashboardMetric } from '@resgata/shared'

const decimalFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
})

const integerFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
})

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  currency: 'BRL',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: 'currency',
})

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
})

const normalizeUnit = (unit: string) =>
  unit
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()

const isPercentageUnit = (unit: string) =>
  ['%', 'percent', 'percentage', 'percentual', 'porcentagem'].includes(unit)

const isCurrencyUnit = (unit: string) =>
  ['brl', 'r$', 'real', 'reais'].includes(unit)

const isCountUnit = (unit: string) =>
  ['count', 'contagem', 'numero', 'número'].includes(unit)

const singularUnits: Record<string, string> = {
  dias: 'dia',
  doacoes: 'doação',
  familias: 'família',
  missoes: 'missão',
  pessoas: 'pessoa',
  refeicoes: 'refeição',
  resgates: 'resgate',
  unidades: 'unidade',
}

export const formatDashboardValue = (
  value: DashboardMetric['value'],
  unit: DashboardMetric['unit'],
) => {
  if (value === null) return 'Não disponível'

  const normalizedUnit = normalizeUnit(unit)

  if (isCurrencyUnit(normalizedUnit)) {
    return currencyFormatter.format(value)
  }

  if (isPercentageUnit(normalizedUnit)) {
    return `${decimalFormatter.format(value)}%`
  }

  if (isCountUnit(normalizedUnit)) {
    return integerFormatter.format(value)
  }

  const formattedValue = Number.isInteger(value)
    ? integerFormatter.format(value)
    : decimalFormatter.format(value)

  if (['day', 'days', 'dia', 'dias'].includes(normalizedUnit)) {
    return `${formattedValue} ${value === 1 ? 'dia' : 'dias'}`
  }

  if (
    ['min', 'minute', 'minutes', 'minuto', 'minutos'].includes(normalizedUnit)
  ) {
    return `${formattedValue} min`
  }

  if (['kilogram', 'kilograms', 'kgs'].includes(normalizedUnit)) {
    return `${formattedValue} kg`
  }

  const displayUnit =
    value === 1 && singularUnits[normalizedUnit]
      ? singularUnits[normalizedUnit]
      : unit

  return displayUnit ? `${formattedValue} ${displayUnit}` : formattedValue
}

export const formatDashboardMonth = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, monthNumber - 1, 1))
  // "ago. de 2026" -> "Ago. de 2026": capitalize the first letter only.
  const label = monthFormatter.format(date).toLowerCase()
  return label.charAt(0).toUpperCase() + label.slice(1)
}
