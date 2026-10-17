import type { DonationCategory, NgoNeed } from '@resgata/shared'

export const needCategoryLabels: Record<DonationCategory, string> = {
  bakery: 'Pães e padaria',
  dairy: 'Laticínios',
  other: 'Outros',
  pantry: 'Mercearia',
  prepared: 'Refeições prontas',
  produce: 'Frutas e verduras',
}

const kg = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export const formatKg = (value: number) => `${kg.format(value)} kg`

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

export const needProgress = (need: Pick<NgoNeed, 'quantityKg' | 'remainingKg'>) =>
  need.quantityKg > 0
    ? Math.round(((need.quantityKg - need.remainingKg) / need.quantityKg) * 100)
    : 0

/** Default deadline for a new need: end of the day after tomorrow. */
export const defaultNeedDeadline = (now = new Date()) => {
  const date = new Date(now)
  date.setDate(date.getDate() + 2)
  date.setHours(20, 0, 0, 0)
  return date
}
