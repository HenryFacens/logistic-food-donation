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
