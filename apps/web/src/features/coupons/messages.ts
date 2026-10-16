export const couponMessages = {
  emptyDescription: 'Novos benefícios simulados aparecerão quando estiverem ativos.',
  emptyTitle: 'Nenhum cupom disponível',
  loadError: 'Não foi possível carregar os cupons.',
  redeemError: 'Não foi possível resgatar este cupom.',
  redeemSuccess: 'Cupom emitido. Guarde o código para apresentar ao parceiro.',
} as const

export const couponErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback
