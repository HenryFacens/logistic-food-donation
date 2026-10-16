export interface PartnerMetricInput {
  key: string
  label: string
  unit: string
  value: number
}

export interface RedemptionInput {
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
  const conversion =
    redemptions.length === 0 ? 0 : (used / redemptions.length) * 100

  return {
    conversionLabel: `${decimalFormatter.format(conversion)}%`,
    issued,
    total: redemptions.length,
    used,
  }
}

