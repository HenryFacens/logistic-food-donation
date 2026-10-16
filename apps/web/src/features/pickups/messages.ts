export const pickupMessages = {
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
