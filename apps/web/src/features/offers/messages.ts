export const offerMessages = {
  acceptError: 'Não foi possível aceitar esta oferta.',
  acceptSuccess: 'Oferta aceita. O recebimento já foi criado.',
  emptyDescription: 'Novas oportunidades compatíveis aparecerão aqui.',
  emptyTitle: 'Nenhuma oferta disponível',
  loadError: 'Não foi possível carregar as ofertas.',
  rejectError: 'Não foi possível recusar esta oferta.',
  rejectSuccess: 'Oferta recusada. A próxima ONG será consultada.',
} as const

export const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback
