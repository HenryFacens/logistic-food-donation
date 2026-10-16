export interface ImpactMetricInput {
  key: string
  label: string
  unit: string
  value: number
}

export interface ImpactCategoryInput {
  category: string
  donations: number
  weightKg: number
}

const categoryLabels: Record<string, string> = {
  bakery: 'Padaria',
  dairy: 'Laticínios',
  pantry: 'Mercearia',
  prepared: 'Refeições prontas',
  produce: 'Hortifrúti',
  other: 'Outros',
}

const integerFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
})

const decimalFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
})

export const formatMetricValue = (value: number, unit: string) => {
  const formatted =
    Number.isInteger(value) && unit !== 'kg' && unit !== 'kg CO₂e'
      ? integerFormatter.format(value)
      : decimalFormatter.format(value)
  return `${formatted} ${unit}`
}

export const formatDateRange = (start: string, end: string) => {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  return `${formatter.format(new Date(start))} a ${formatter.format(new Date(end))}`
}

export const buildImpactCards = (metrics: ImpactMetricInput[]) =>
  metrics.map((metric) => ({
    ...metric,
    formattedValue: formatMetricValue(metric.value, metric.unit),
  }))

export const buildCategoryRows = (categories: ImpactCategoryInput[]) => {
  const maximumWeight = Math.max(...categories.map(({ weightKg }) => weightKg), 0)

  return [...categories]
    .sort((left, right) => right.weightKg - left.weightKg)
    .map((item) => ({
      ...item,
      label: categoryLabels[item.category] || item.category,
      percentage:
        maximumWeight === 0 ? 0 : Math.max(4, (item.weightKg / maximumWeight) * 100),
      weightLabel: `${decimalFormatter.format(item.weightKg)} kg`,
    }))
}
