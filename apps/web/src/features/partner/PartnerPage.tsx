import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  MetricValue,
  SimuladoBadge,
  StatusBadge,
} from '../../shared/ui'
import {
  usePartnerDashboardQuery,
  usePartnerProfileQuery,
  usePartnerRedemptionsQuery,
} from './queries'
import {
  formatPartnerMetric,
  formatRedemptionDate,
  formatRoi,
  redemptionStatusLabels,
  summarizeRedemptions,
} from './view-model'
import './partner.css'

const statusTone = {
  cancelled: 'danger',
  issued: 'warning',
  used: 'success',
} as const

const Failure = ({
  message,
  retry,
}: {
  message: string
  retry(): void
}) => (
  <Card>
    <EmptyState
      action={
        <Button icon="refresh" onClick={retry}>
          Tentar novamente
        </Button>
      }
      description={message}
      icon="warning"
      title="Painel indisponível"
    />
  </Card>
)

export function PartnerPage() {
  const profile = usePartnerProfileQuery()
  const dashboard = usePartnerDashboardQuery(profile.isSuccess)
  const redemptions = usePartnerRedemptionsQuery(profile.data?.profileId)

  if (profile.isPending || (profile.isSuccess && dashboard.isPending)) {
    return <LoadingState label="Consolidando patrocínios e resgates" />
  }

  if (profile.isError) {
    return (
      <Failure
        message={profile.error.message}
        retry={() => void profile.refetch()}
      />
    )
  }

  if (dashboard.isError) {
    return (
      <Failure
        message={dashboard.error.message}
        retry={() => void dashboard.refetch()}
      />
    )
  }

  if (!dashboard.data) return null

  const summary = summarizeRedemptions(redemptions.data?.items || [])

  return (
    <div className="partner-page">
      <section className="partner-hero">
        <div>
          <div className="partner-hero__label">
            <span className="eyebrow">Programa de impacto</span>
            <SimuladoBadge />
          </div>
          <h2>{profile.data.displayName}</h2>
          <p>
            Visão estimada do alcance social associado aos patrocínios e
            benefícios disponibilizados.
          </p>
        </div>
        <div className="partner-hero__roi">
          <span>ROI social estimado</span>
          <strong><MetricValue value={formatRoi(dashboard.data.estimatedRoi)} /></strong>
        </div>
      </section>

      <section className="partner-kpis" aria-label="Indicadores do parceiro">
        <Card className="partner-kpi">
          <span>Entregas patrocinadas</span>
          <strong>{dashboard.data.sponsoredDeliveries}</strong>
        </Card>
        <Card className="partner-kpi">
          <span>Pessoas alcançadas</span>
          <strong>{dashboard.data.estimatedReachPeople}</strong>
        </Card>
        <Card className="partner-kpi">
          <span>Cupons ativos</span>
          <strong>{dashboard.data.activeCoupons}</strong>
        </Card>
        {dashboard.data.metrics.map((metric) => (
          <Card className="partner-kpi" key={metric.key}>
            <span>{metric.label}</span>
            <strong><MetricValue value={formatPartnerMetric(metric.value, metric.unit)} /></strong>
          </Card>
        ))}
      </section>

      <div className="partner-content">
        <Card className="partner-redemptions">
          <div className="partner-section-heading">
            <div>
              <span className="eyebrow">Benefícios</span>
              <h2>Resgates de cupons</h2>
            </div>
            <Button
              icon="refresh"
              onClick={() => void redemptions.refetch()}
              disabled={redemptions.isFetching}
              variant="secondary"
            >
              Atualizar
            </Button>
          </div>

          {redemptions.isPending ? (
            <LoadingState label="Carregando resgates" />
          ) : redemptions.isError ? (
            <EmptyState
              action={
                <Button
                  icon="refresh"
                  onClick={() => void redemptions.refetch()}
                >
                  Recarregar
                </Button>
              }
              description={redemptions.error.message}
              icon="warning"
              title="Resgates indisponíveis"
            />
          ) : redemptions.data.items.length === 0 ? (
            <EmptyState
              description="Os resgates emitidos para os cupons deste parceiro aparecerão aqui."
              icon="coupon"
              title="Nenhum resgate registrado"
            />
          ) : (
            <div className="partner-table-wrap">
              <table className="partner-table">
                <caption className="partner-visually-hidden">
                  Histórico de resgates de cupons simulados
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Cupom</th>
                    <th scope="col">Código</th>
                    <th scope="col">Emissão</th>
                    <th scope="col">Status</th>
                    <th scope="col">Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {redemptions.data.items.map((redemption) => (
                    <tr key={redemption.id}>
                      <td>
                        <strong>{redemption.couponTitle}</strong>
                      </td>
                      <td>
                        <code>{redemption.redemptionCode}</code>
                      </td>
                      <td>{formatRedemptionDate(redemption.issuedAt)}</td>
                      <td>
                        <StatusBadge
                          label={redemptionStatusLabels[redemption.status]}
                          tone={statusTone[redemption.status]}
                        />
                      </td>
                      <td>
                        {redemption.simulated ? <SimuladoBadge /> : 'Real'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="partner-funnel">
          <span className="eyebrow">Uso dos benefícios</span>
          <h2>Conversão de cupons</h2>
          <div className="partner-funnel__rate">
            <strong>{summary.conversionLabel}</strong>
            <span>dos resgates foram utilizados</span>
          </div>
          <dl>
            <div>
              <dt>Total emitido</dt>
              <dd>{summary.total}</dd>
            </div>
            <div>
              <dt>Aguardando uso</dt>
              <dd>{summary.issued}</dd>
            </div>
            <div>
              <dt>Utilizados</dt>
              <dd>{summary.used}</dd>
            </div>
          </dl>
          <p>
            Indicadores financeiros e de alcance são estimativas de
            demonstração.
          </p>
        </Card>
      </div>
    </div>
  )
}
