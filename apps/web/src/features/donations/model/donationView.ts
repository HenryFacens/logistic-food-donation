import type {
  DonationCategory,
  DonationStatus,
  DonationUnit,
} from '@resgata/shared'
import type { StatusTone } from '../../../shared/ui'

export const donationCategoryLabels: Record<DonationCategory, string> = {
  bakery: 'Padaria',
  dairy: 'Laticínios',
  other: 'Outros',
  pantry: 'Mercearia',
  prepared: 'Alimento preparado',
  produce: 'Hortifruti',
}

export const donationUnitLabels: Record<DonationUnit, string> = {
  box: 'caixas',
  kg: 'kg',
  tray: 'bandejas',
  unit: 'unidades',
}

export const donationStatusView: Record<
  DonationStatus,
  { label: string; tone: StatusTone }
> = {
  accepted: { label: 'Aceita por uma ONG', tone: 'info' },
  classified: { label: 'Classificada', tone: 'info' },
  collected: { label: 'Coletada', tone: 'warning' },
  delivered: { label: 'Entregue', tone: 'success' },
  expired: { label: 'Expirada', tone: 'danger' },
  no_destination: { label: 'Sem destino', tone: 'danger' },
  offered: { label: 'Ofertada às ONGs', tone: 'warning' },
  posted: { label: 'Publicada', tone: 'neutral' },
}

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))

export const formatTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

export const formatRemainingTime = (
  expiresAt: string,
  now = new Date(),
) => {
  const remainingMinutes = Math.ceil(
    (new Date(expiresAt).getTime() - now.getTime()) / 60_000,
  )
  if (remainingMinutes <= 0) return 'Prazo encerrado'
  const hours = Math.floor(remainingMinutes / 60)
  const minutes = remainingMinutes % 60
  if (!hours) return `${minutes} min`
  if (!minutes) return `${hours}h`
  return `${hours}h ${minutes}min`
}

export const nextDonationStepLabel = (status: DonationStatus) => {
  const nextSteps: Record<DonationStatus, string | null> = {
    accepted: 'Aguardar a retirada pelo coletador',
    classified: 'Encontrar uma entidade compatível',
    collected: 'Aguardar a confirmação da entrega',
    delivered: null,
    expired: null,
    no_destination: null,
    offered: 'Aguardar a resposta de uma entidade',
    posted: 'Concluir a classificação',
  }
  return nextSteps[status]
}

export const eventLabel = (eventType: string, status: DonationStatus) => {
  const knownEvents: Record<string, string> = {
    'donation.accepted': 'Uma ONG aceitou a doação',
    'donation.classified': 'Classificação concluída',
    'donation.collected': 'Coleta confirmada',
    'donation.created': 'Doação publicada',
    'donation.delivered': 'Entrega confirmada',
    'donation.expired': 'Prazo da doação encerrado',
    'donation.no_destination': 'Nenhum destino encontrado',
    'donation.offered': 'Oferta enviada às ONGs',
  }
  return knownEvents[eventType] || donationStatusView[status].label
}
