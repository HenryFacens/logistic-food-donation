export const offerMessages = {
  matchesRequest: 'Atende seu pedido:',
  distance: 'Distância de carro',
  covers: 'cobre',
  of: 'de',
  unitLabels: { box: 'caixas', kg: 'kg', tray: 'bandejas', unit: 'unidades' },
  conditionGood: 'Foto conferida pela IA: aparência boa.',
  conditionAttention: 'Foto conferida pela IA: confira ao receber.',
  acceptError: 'Não foi possível aceitar. Talvez outra ONG tenha aceitado antes.',
  acceptSuccess: 'Doação aceita. Já estamos chamando um motorista — acompanhe em Entregas.',
  emptyDescription: 'Cadastre o que vocês precisam em Solicitações para receber doações que combinem.',
  emptyTitle: 'Nada para responder agora',
  loadError: 'Verifique sua conexão e tente de novo.',
  rejectError: 'Não foi possível recusar. Tente de novo.',
  rejectSuccess: 'Recusada. Vamos oferecer para outra ONG.',
} as const

export const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback
