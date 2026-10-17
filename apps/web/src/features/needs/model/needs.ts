import type { DonationCategory, DonationUnit, NgoNeed } from '@resgata/shared'

export const needCategoryLabels: Record<DonationCategory, string> = {
  bakery: 'Pães e padaria',
  dairy: 'Laticínios',
  other: 'Outros',
  pantry: 'Mercearia',
  prepared: 'Refeições prontas',
  produce: 'Frutas e verduras',
}

const amount = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export const needUnitLabels: Record<DonationUnit, [singular: string, plural: string]> = {
  box: ['caixa', 'caixas'],
  kg: ['kg', 'kg'],
  tray: ['bandeja', 'bandejas'],
  unit: ['unidade', 'unidades'],
}

/** "25 unidades", "1 caixa", "3,5 kg". */
export const formatQuantity = (value: number, unit: DonationUnit) =>
  `${amount.format(value)} ${needUnitLabels[unit][value === 1 ? 0 : 1]}`

/** "hoje", "amanhã" or a short date, for need deadlines. */
export const formatDeadline = (iso: string, now = new Date()) => {
  const date = new Date(iso)
  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  const days = Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000)
  if (days <= 0) return 'hoje'
  if (days === 1) return 'amanhã'
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export const needProgress = (need: Pick<NgoNeed, 'quantity' | 'remainingQuantity'>) =>
  need.quantity > 0
    ? Math.round(((need.quantity - need.remainingQuantity) / need.quantity) * 100)
    : 0

/** Default deadline for a new need: end of the day after tomorrow. */
export const defaultNeedDeadline = (now = new Date()) => {
  const date = new Date(now)
  date.setDate(date.getDate() + 2)
  date.setHours(20, 0, 0, 0)
  return date
}
