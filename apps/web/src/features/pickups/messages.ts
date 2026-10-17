export const pickupMessages = {
  availabilityEyebrow: 'Disponibilidade',
  online: 'Você está disponível para coletas',
  offline: 'Você está offline',
  onlineBadge: 'Disponível',
  offlineBadge: 'Offline',
  capacity: 'Capacidade do veículo:',
  goOnline: 'Ficar disponível',
  goOffline: 'Ficar offline',
  updating: 'Atualizando…',
  refreshLocation: 'Atualizar minha localização',
  locationShared: 'Localização atualizada. Mostramos primeiro as coletas mais perto de você.',
  locationNotShared:
    'Não foi possível usar o GPS (precisa de https e permissão). Usando a última localização conhecida.',
  assignError: 'Não foi possível assumir esta coleta.',
  assignSuccess: 'Coleta atribuída a você.',
  collectError: 'Não foi possível confirmar a retirada.',
  collectSuccess: 'Retirada confirmada. Siga para a ONG.',
  deliverError: 'Não foi possível confirmar a entrega.',
  deliverSuccess: 'Entrega confirmada. Pontos adicionados.',
  emptyDriver: 'Nenhuma rota disponível ou atribuída neste momento.',
  emptyNgo: 'Os recebimentos aceitos aparecerão aqui.',
  loadError: 'Não foi possível carregar os recebimentos.',
} as const

export const pickupErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback
