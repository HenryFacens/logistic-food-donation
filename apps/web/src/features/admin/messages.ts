export const adminMessages = {
  eyebrow: 'Equipe Resgata · operação',
  title: 'Saúde da operação',
  subtitle:
    'Indicadores calculados a partir do message bus e ferramentas reais de recuperação.',
  indicatorTitle: 'Filas sem dead-letter',
  activityTitle: 'Fluxo de mensagens',
  queuesTitle: 'Filas por evento',
  deadLettersTitle: 'Mensagens dead-letter',
  platformDashboard: {
    eyebrow: 'Equipe Resgata · visão executiva',
    title: 'Métricas da plataforma',
    subtitle:
      'Acompanhe eficiência operacional, volume resgatado, atividade da rede e qualidade dos recebimentos.',
    queuesCta: 'Abrir operação de filas',
    evidenceTitle: 'Base de cada indicador',
    operationalNote:
      'Este painel consolida resultados da plataforma. Diagnóstico técnico e replay permanecem na operação de filas.',
    loading: 'Consolidando métricas da plataforma',
    errorTitle: 'Painel da plataforma indisponível',
    empty: 'Nenhum indicador foi retornado para o período.',
    charts: {
      flowEyebrow: 'Jornada operacional',
      flowTitle: 'Da publicação ao recebimento',
      flowDescription:
        'A redução entre etapas mostra onde o alimento deixa de avançar na rede.',
      flowAriaLabel:
        'Funil de ofertas publicadas, aceitas, coletadas e recebidas',
      flowMethod:
        'Coletas e recebimentos são calculados pelas taxas de conclusão sobre as ofertas aceitas.',
      matchingTitle: 'Eficiência do matching',
      matchingAriaLabel: 'Taxa de ofertas com e sem matching',
      matchingCenterLabel: 'com matching',
      matchingSuccess: 'Com matching',
      deliveryTitle: 'Entrega confirmada',
      deliveryAriaLabel:
        'Taxa de entregas confirmadas e ainda não confirmadas',
      deliveryCenterLabel: 'confirmadas',
      deliverySuccess: 'Confirmadas',
      usersEyebrow: 'Rede ativa',
      usersTitle: 'Participação por perfil',
      usersDescription:
        'Quantidade de perfis que movimentaram a operação no período.',
      usersAriaLabel: 'Barras de usuários ativos por perfil',
      qualityEyebrow: 'Pontos de atenção',
      qualityTitle: 'Expiração e qualidade',
      qualityDescription:
        'Ocorrências que exigem revisão do matching ou do recebimento.',
      qualityAriaLabel:
        'Barras de ofertas expiradas e incidentes de qualidade',
      networkAriaLabel: 'Participação da rede e pontos de atenção',
      unavailable: 'Indicador indisponível para este período.',
    },
    essentials: {
      eyebrow: 'Leitura executiva',
      title: 'Indicadores essenciais',
      description:
        'Tempo de matching, conclusão de coleta, volume e valor resgatado.',
      ariaLabel: 'Indicadores essenciais da plataforma',
    },
  },
} as const
