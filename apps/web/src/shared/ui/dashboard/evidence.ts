import type { MetricEvidence } from '@resgata/shared'

export interface EvidencePresentation {
  description: string
  label: string
}

export const evidencePresentation: Record<
  MetricEvidence,
  EvidencePresentation
> = {
  recorded: {
    description: 'Valor registrado diretamente no sistema.',
    label: 'Registrado',
  },
  calculated: {
    description: 'Valor calculado a partir de dados registrados.',
    label: 'Calculado',
  },
  estimated: {
    description: 'Valor estimado com base em premissas informadas.',
    label: 'Estimado',
  },
  unavailable: {
    description: 'Não há dados suficientes para apresentar este valor.',
    label: 'Não disponível',
  },
}

export const evidenceOrder: MetricEvidence[] = [
  'recorded',
  'calculated',
  'estimated',
  'unavailable',
]
