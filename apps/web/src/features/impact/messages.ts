export const impactMessages = {
  eyebrow: 'Produtor / doador',
  title: 'Doações e valor gerado',
  subtitle:
    'Acompanhe o que foi efetivamente entregue e separe resultados comprovados de estimativas.',
  evidenceTitle: 'Como ler os valores',
  deliveredTitle: 'Do entregue ao impacto',
  valueTitle: 'Valor da doação',
  categoriesTitle: 'Destino por categoria',
  recentTitle: 'Doações recentes no período',
  forecastTitle: 'Próximo ciclo',
  unavailableFiscal:
    'Regime tributário, documentação fiscal e economia dedutível ainda não fazem parte do contrato atual.',
} as const

export const sellerMetricsMessages = {
  eyebrow: 'Produtor / doador',
  title: 'Seu impacto',
  subtitle:
    'O que suas doações já fizeram. Números conferidos pela ONG aparecem separados das estimativas.',
  loading: 'Calculando as métricas das suas doações',
  loadErrorTitle: 'Não foi possível carregar suas métricas',
  retry: 'Tentar novamente',
  simulatedStatus: 'Dados de demonstração',
  evidenceLabel: 'Como interpretar as métricas',
  fiscalNoticeTitle: 'Atenção fiscal',
  charts: {
    flowEyebrow: 'Da publicação ao recebimento',
    flowTitle: 'Quanto da doação chegou à ONG',
    flowDescription:
      'Do que você publicou, quanto foi coletado e quanto a ONG conferiu na chegada.',
    flowAriaLabel:
      'Funil de quilos publicados, coletados e recebidos pela ONG',
    completionEyebrow: 'Resultado do período',
    completionTitle: 'Doações concluídas',
    completionDescription:
      'Uma doação só é concluída após a confirmação de recebimento pela ONG.',
    completionAriaLabel: 'Percentual de doações concluídas e não concluídas',
    completionCenterLabel: 'concluídas',
    trendsEyebrow: 'Evolução mensal',
    trendsTitle: 'Ritmo das suas doações',
    trendsDescription:
      'As curvas mostram volume e frequência sem esconder meses com pouca atividade.',
    kgTrend: 'Kg publicados por mês',
    kgTrendAriaLabel: 'Curva mensal de quilos publicados',
    donationsTrend: 'Doações publicadas por mês',
    donationsTrendAriaLabel: 'Curva mensal do número de doações publicadas',
    loyaltyEyebrow: 'Fidelização',
    loyaltyTitle: 'Retorno em 30, 60 e 90 dias',
    loyaltyDescription:
      'Quanto menor a janela, mais constante é a rotina de doação.',
    loyaltyAriaLabel: 'Taxas de repetição das doações por período',
    unavailable: 'Indicador indisponível para este período.',
    noMonthlyData: 'Ainda não há meses suficientes para desenhar a curva.',
  },
  essentials: {
    eyebrow: 'Leitura rápida',
    title: 'Indicadores essenciais',
    description:
      'Tempo, validade, qualidade e valores documentados para acompanhar a operação.',
    ariaLabel: 'Indicadores essenciais da doação',
  },
  ratings: {
    eyebrow: 'Após o recebimento',
    title: 'Avalie o motorista',
    description:
      'Sua avaliação fica disponível somente quando a ONG confirma o recebimento.',
    loading: 'Buscando entregas disponíveis para avaliação',
    loadErrorTitle: 'Não foi possível carregar as avaliações',
    emptyTitle: 'Nenhuma avaliação pendente',
    emptyDescription:
      'Quando uma entrega for confirmada pela ONG, ela aparecerá aqui.',
    deliveredAt: 'Recebimento confirmado em',
    scoreLegend: 'Qual nota você dá ao motorista?',
    scoreLabel: (score: number) =>
      `${score} ${score === 1 ? 'estrela' : 'estrelas'}`,
    tagsLegend: 'O que se destacou?',
    commentLabel: 'Comentário',
    commentHint: 'Opcional, até 1.000 caracteres.',
    commentPlaceholder:
      'Conte como foi a pontualidade, o cuidado e a comunicação.',
    submit: 'Enviar avaliação',
    submitting: 'Enviando avaliação',
    success: 'Avaliação registrada.',
    ratingRequired: 'Selecione uma nota de 1 a 5.',
    invalid: 'Revise os dados da avaliação antes de enviar.',
    tags: [
      { label: 'Pontualidade', value: 'pontualidade' },
      { label: 'Cuidado', value: 'cuidado' },
      { label: 'Comunicação', value: 'comunicação' },
      { label: 'Profissionalismo', value: 'profissionalismo' },
    ],
  },
} as const
