import {
  AppIcon,
  Button,
  Card,
  EmptyState,
  LoadingState,
  SimuladoBadge,
  StatusBadge,
} from '../../shared/ui'
import { impactMessages } from './messages'
import { useImpactDashboardQuery, useImpactForecastQuery } from './queries'
import {
  buildCategoryRows,
  buildImpactCards,
  buildImpactSnapshot,
  formatDateRange,
  formatMetricValue,
} from './view-model'
import './impact.css'

const ErrorPanel = ({
  message,
  onRetry,
}: {
  message: string
  onRetry(): void
}) => (
  <Card>
    <EmptyState
      action={
        <Button icon="refresh" onClick={onRetry}>
          Tentar novamente
        </Button>
      }
      description={message}
      icon="warning"
      title="Não foi possível carregar o painel"
    />
  </Card>
)

export function ImpactPage() {
  const dashboard = useImpactDashboardQuery()
  const forecast = useImpactForecastQuery()

  if (dashboard.isPending) {
    return <LoadingState label="Calculando impacto das suas doações" />
  }

  if (dashboard.isError) {
    return (
      <ErrorPanel
        message={dashboard.error.message}
        onRetry={() => void dashboard.refetch()}
      />
    )
  }

  const cards = buildImpactCards(dashboard.data.metrics)
  const categoryRows = buildCategoryRows(dashboard.data.byCategory)
  const snapshot = buildImpactSnapshot(dashboard.data.metrics)
  const period = formatDateRange(
    dashboard.data.periodStart,
    dashboard.data.periodEnd,
  )

  return (
    <div className="impact-page">
      <header className="impact-header" aria-labelledby="impact-heading">
        <div>
          <span className="eyebrow">{impactMessages.eyebrow}</span>
          <h2 id="impact-heading">{impactMessages.title}</h2>
          <p>{impactMessages.subtitle}</p>
        </div>
        <div className="impact-header__period">
          <StatusBadge label="Dados reais" tone="success" />
          <span>{period}</span>
        </div>
      </header>

      <Card className="impact-evidence" aria-label={impactMessages.evidenceTitle}>
        <strong>{impactMessages.evidenceTitle}</strong>
        <div>
          <StatusBadge label="Comprovado" tone="success" />
          <span>entregas e peso registrados</span>
        </div>
        <div>
          <StatusBadge label="Estimado" tone="warning" />
          <span>usa fator de conversão</span>
        </div>
        <div>
          <StatusBadge label="Não disponível" tone="neutral" />
          <span>depende de contrato ou validação externa</span>
        </div>
      </Card>

      <Card className="impact-delivery">
        <div className="impact-section-heading">
          <div>
            <span className="eyebrow">Resultado do período</span>
            <h2>{impactMessages.deliveredTitle}</h2>
          </div>
          <StatusBadge label="Comprovado" tone="success" />
        </div>

        <div className="impact-delivery__rail" aria-label="Resumo de entregas">
          <div>
            <span>Doações entregues</span>
            <strong>{formatMetricValue(snapshot.donations, 'doações')}</strong>
          </div>
          <AppIcon name="arrow-right" size={24} />
          <div>
            <span>Recebido pelas entidades</span>
            <strong>{formatMetricValue(snapshot.weightKg, 'kg')}</strong>
          </div>
          <div className="impact-delivery__rate">
            <span>Cobertura documental</span>
            <strong>{snapshot.proofCoverageLabel}</strong>
          </div>
        </div>
        <p>
          O contrato atual consolida somente doações com entrega concluída; não
          há totais de publicação e coleta para calcular uma taxa de conversão.
        </p>
      </Card>

      <section aria-labelledby="impact-value-heading">
        <div className="impact-title-row">
          <h2 id="impact-value-heading">{impactMessages.valueTitle}</h2>
          <span>{period}</span>
        </div>
        <div className="impact-metrics">
          {cards.map((metric) => (
            <Card
              className={`impact-metric impact-metric--${metric.evidence}`}
              key={metric.key}
            >
              <div>
                {metric.evidence === 'real' ? (
                  <StatusBadge label="Comprovado" tone="success" />
                ) : (
                  <StatusBadge label="Estimado" tone="warning" />
                )}
              </div>
              <span>{metric.label}</span>
              <strong>{metric.formattedValue}</strong>
              <small>
                {metric.evidence === 'real'
                  ? 'Consolidado a partir de entregas concluídas.'
                  : 'Derivado do peso entregue por fator de conversão.'}
              </small>
            </Card>
          ))}
          <Card className="impact-metric impact-metric--unavailable">
            <div>
              <StatusBadge label="Não disponível" tone="neutral" />
            </div>
            <span>Economia fiscal</span>
            <strong>—</strong>
            <small>{impactMessages.unavailableFiscal}</small>
          </Card>
        </div>
      </section>

      <div className="impact-grid">
        <Card className="impact-categories">
          <div className="impact-section-heading">
            <div>
              <span className="eyebrow">Comprovado</span>
              <h2>{impactMessages.categoriesTitle}</h2>
            </div>
            <span className="impact-section-heading__hint">peso entregue</span>
          </div>

          {categoryRows.length === 0 ? (
            <EmptyState
              description="As categorias aparecem após a primeira entrega concluída no período."
              title="Ainda não há distribuição"
            />
          ) : (
            <figure className="impact-chart">
              <figcaption className="impact-visually-hidden">
                Gráfico de barras do peso entregue por categoria
              </figcaption>
              {categoryRows.map((row) => (
                <div className="impact-chart__row" key={row.category}>
                  <div className="impact-chart__label">
                    <strong>{row.label}</strong>
                    <span>
                      {row.donations}{' '}
                      {row.donations === 1 ? 'doação' : 'doações'} ·{' '}
                      {row.weightLabel}
                    </span>
                  </div>
                  <div className="impact-chart__track" aria-hidden="true">
                    <span style={{ width: `${row.percentage}%` }} />
                  </div>
                </div>
              ))}
            </figure>
          )}
        </Card>

        <Card className="impact-forecast">
          <div className="impact-section-heading">
            <div>
              <span className="eyebrow">Estimativa</span>
              <h2>{impactMessages.forecastTitle}</h2>
            </div>
            <SimuladoBadge />
          </div>

          {forecast.isPending ? (
            <LoadingState label="Calculando a previsão" />
          ) : forecast.isError ? (
            <EmptyState
              action={
                <Button icon="refresh" onClick={() => void forecast.refetch()}>
                  Recarregar previsão
                </Button>
              }
              description={forecast.error.message}
              icon="warning"
              title="Previsão indisponível"
            />
          ) : (
            <>
              <div className="impact-forecast__numbers">
                <div>
                  <strong>
                    {formatMetricValue(
                      forecast.data.expectedDonations,
                      'doações',
                    )}
                  </strong>
                  <span>esperadas em {forecast.data.horizonDays} dias</span>
                </div>
                <div>
                  <strong>
                    {formatMetricValue(forecast.data.expectedWeightKg, 'kg')}
                  </strong>
                  <span>peso estimado</span>
                </div>
              </div>
              <p className="impact-forecast__method">
                {forecast.data.methodology}
              </p>
            </>
          )}
        </Card>
      </div>

      <Card className="impact-recent">
        <div className="impact-section-heading">
          <div>
            <span className="eyebrow">Rastreabilidade</span>
            <h2>{impactMessages.recentTitle}</h2>
          </div>
          <span className="impact-section-heading__hint">
            {dashboard.data.recentDonationIds.length} registros
          </span>
        </div>
        {dashboard.data.recentDonationIds.length === 0 ? (
          <EmptyState
            description="As referências aparecerão quando houver doações no período."
            title="Nenhuma doação recente"
          />
        ) : (
          <ol>
            {dashboard.data.recentDonationIds.map((donationId, index) => (
              <li key={donationId}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <code>{donationId}</code>
                <StatusBadge label="Registrada" tone="success" />
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  )
}
