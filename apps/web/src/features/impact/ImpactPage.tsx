import {
  AppIcon,
  Button,
  Card,
  EmptyState,
  LoadingState,
  MetricValue,
  SimuladoBadge,
} from '../../shared/ui'
import { useImpactDashboardQuery, useImpactForecastQuery } from './queries'
import {
  buildCategoryRows,
  buildImpactCards,
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

  return (
    <div className="impact-page">
      <section className="impact-hero" aria-labelledby="impact-heading">
        <div>
          <span className="eyebrow">Resultado confirmado</span>
          <h2 id="impact-heading">Alimento aproveitado, impacto mensurável.</h2>
          <p>
            Entregas concluídas entre{' '}
            {formatDateRange(
              dashboard.data.periodStart,
              dashboard.data.periodEnd,
            )}
            .
          </p>
        </div>
        <div className="impact-hero__mark" aria-hidden="true">
          <AppIcon name="dashboard" size={30} />
        </div>
      </section>

      <section className="impact-metrics" aria-label="Indicadores de impacto">
        {cards.map((metric) => (
          <Card className="impact-metric" key={metric.key}>
            <span>{metric.label}</span>
            <strong><MetricValue value={metric.formattedValue} /></strong>
          </Card>
        ))}
      </section>

      <div className="impact-grid">
        <Card className="impact-categories">
          <div className="impact-section-heading">
            <div>
              <span className="eyebrow">Composição</span>
              <h2>Destino por categoria</h2>
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
              <span className="eyebrow">Próximo ciclo</span>
              <h2>Previsão de doações</h2>
            </div>
            <SimuladoBadge />
          </div>

          {forecast.isPending ? (
            <LoadingState label="Gerando previsão simulada" />
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
                    <MetricValue
                      value={formatMetricValue(
                        forecast.data.expectedDonations,
                        'doações',
                      )}
                    />
                  </strong>
                  <span>esperadas em {forecast.data.horizonDays} dias</span>
                </div>
                <div>
                  <strong>
                    <MetricValue
                      value={formatMetricValue(forecast.data.expectedWeightKg, 'kg')}
                    />
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
    </div>
  )
}
