export interface PartnerMetricInput {
  key: string
  label: string
  unit: string
  value: number
}

export interface RedemptionInput {
  driverId?: string
  issuedAt: string
  status: 'cancelled' | 'issued' | 'used'
}

const decimalFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
})

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  currency: 'BRL',
  style: 'currency',
})

export const formatPartnerMetric = (value: number, unit: string) => {
  if (unit === 'BRL') return currencyFormatter.format(value)
  return `${decimalFormatter.format(value)} ${unit}`
}

export const formatRoi = (value: number) =>
  `${decimalFormatter.format(value)} pessoas/R$`

export const formatRedemptionDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))

export const redemptionStatusLabels = {
  cancelled: 'Cancelado',
  issued: 'Emitido',
  used: 'Utilizado',
} as const

export const summarizeRedemptions = (redemptions: RedemptionInput[]) => {
  const used = redemptions.filter(({ status }) => status === 'used').length
  const issued = redemptions.filter(({ status }) => status === 'issued').length
  const cancelled = redemptions.filter(
    ({ status }) => status === 'cancelled',
  ).length
  const drivers = new Set(
    redemptions.map(({ driverId }) => driverId).filter(Boolean),
  ).size
  const conversion =
    redemptions.length === 0 ? 0 : (used / redemptions.length) * 100

  return {
    cancelled,
    conversionLabel: `${decimalFormatter.format(conversion)}%`,
    drivers,
    issued,
    total: redemptions.length,
    used,
  }
}

export const buildRedemptionFunnel = (redemptions: RedemptionInput[]) => {
  const summary = summarizeRedemptions(redemptions)
  const maximum = Math.max(summary.total, 1)

  return [
    {
      key: 'issued-total',
      label: 'Emitidos',
      value: summary.total,
      width: summary.total === 0 ? 0 : 100,
    },
    {
      key: 'used',
      label: 'Usados em compra',
      value: summary.used,
      width: (summary.used / maximum) * 100,
    },
    {
      key: 'waiting',
      label: 'Aguardando uso',
      value: summary.issued,
      width: (summary.issued / maximum) * 100,
    },
    {
      key: 'cancelled',
      label: 'Cancelados',
      value: summary.cancelled,
      width: (summary.cancelled / maximum) * 100,
    },
  ]
}
