export const couponMessages = {
  description: 'Cada entrega concluída rende pontos. Troque por benefícios em parceiros de Campinas.',
  emptyDescription: 'Novos prêmios aparecem aqui assim que os parceiros publicarem.',
  emptyTitle: 'Nenhum prêmio disponível agora',
  loadError: 'Verifique sua conexão e tente de novo.',
  redeemError: 'Não foi possível trocar. Tente de novo.',
  redeemSuccess: 'Prêmio trocado. Mostre o código no parceiro.',
} as const

export const couponErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback
