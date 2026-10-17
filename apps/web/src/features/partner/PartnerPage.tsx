import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  SimuladoBadge,
  StatusBadge,
} from '../../shared/ui'
import { partnerMessages } from './messages'
import {
  usePartnerDashboardQuery,
  usePartnerProfileQuery,
  usePartnerRedemptionsQuery,
} from './queries'
import {
  buildRedemptionFunnel,
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

  const redemptionItems = redemptions.data?.items || []
  const summary = summarizeRedemptions(redemptionItems)
  const funnel = buildRedemptionFunnel(redemptionItems)
  const investment = dashboard.data.metrics.find(
    ({ key }) => key === 'investment',
  )

  return (
    <div className="partner-page">
      <header className="partner-header">
        <div>
          <span className="eyebrow">
            {profile.data.displayName} · {partnerMessages.eyebrow}
          </span>
          <h2>{partnerMessages.title}</h2>
          <p>{partnerMessages.subtitle}</p>
        </div>
        <div className="partner-header__meta">
          <SimuladoBadge />
          <span>Dados consolidados da campanha atual</span>
        </div>
      </header>

      <Card className="partner-funnel">
        <div className="partner-section-heading">
          <div>
            <span className="eyebrow">Conversão observada</span>
            <h2>{partnerMessages.funnelTitle}</h2>
          </div>
          <StatusBadge
            label={
              redemptions.isSuccess
                ? 'Baseado nos resgates'
                : 'Carregando resgates'
            }
            tone={redemptions.isSuccess ? 'success' : 'neutral'}
          />
        </div>

        {redemptions.isPending ? (
          <LoadingState label="Carregando funil de cupons" />
        ) : redemptions.isError ? (
          <EmptyState
            action={
              <Button icon="refresh" onClick={() => void redemptions.refetch()}>
                Recarregar
              </Button>
            }
            description={redemptions.error.message}
            icon="warning"
            title="Funil indisponível"
          />
        ) : (
          <>
            <div className="partner-funnel__bars">
              {funnel.map((stage) => (
                <div className="partner-funnel__row" key={stage.key}>
                  <span>{stage.label}</span>
                  <div aria-hidden="true">
                    <span style={{ width: `${stage.width}%` }} />
                  </div>
                  <strong>{stage.value}</strong>
                </div>
              ))}
            </div>
            <div className="partner-funnel__kpis">
              <div>
                <span>Taxa de uso</span>
                <strong>{summary.conversionLabel}</strong>
                <small>{summary.used} utilizados</small>
              </div>
              <div>
                <span>Transportadores beneficiados</span>
                <strong>{summary.drivers}</strong>
                <small>identificados nos resgates</small>
              </div>
              <div>
                <span>Entregas patrocinadas</span>
                <strong>{dashboard.data.sponsoredDeliveries}</strong>
                <small>no contrato atual</small>
              </div>
              <div>
                <span>Cupons ativos</span>
                <strong>{dashboard.data.activeCoupons}</strong>
                <small>no contrato atual</small>
              </div>
            </div>
          </>
        )}
      </Card>

      <div className="partner-insights">
        <Card className="partner-insight">
          <div className="partner-section-heading">
            <h2>{partnerMessages.commercialTitle}</h2>
            <StatusBadge label="Estimado" tone="warning" />
          </div>
          <div className="partner-insight__metrics">
            <div>
              <span>Investimento associado</span>
              <strong>
                {investment
                  ? formatPartnerMetric(investment.value, investment.unit)
                  : '—'}
              </strong>
              <small>informado pelo painel simulado</small>
            </div>
            <div>
              <span>ROI social estimado</span>
              <strong>{formatRoi(dashboard.data.estimatedRoi)}</strong>
              <small>alcance estimado por real investido</small>
            </div>
          </div>
          <div className="partner-unavailable">
            <span>Receita e margem incremental</span>
            <strong>Não disponíveis</strong>
            <p>
              Não há integração de vendas para calcular retorno financeiro.
            </p>
          </div>
        </Card>

        <Card className="partner-insight">
          <div className="partner-section-heading">
            <h2>{partnerMessages.impactTitle}</h2>
            <StatusBadge label="Estimado" tone="warning" />
          </div>
          <div className="partner-insight__metrics">
            <div>
              <span>Pessoas alcançadas</span>
              <strong>{dashboard.data.estimatedReachPeople}</strong>
              <small>estimativa do contrato do parceiro</small>
            </div>
            <div>
              <span>Missões incentivadas</span>
              <strong>{dashboard.data.sponsoredDeliveries}</strong>
              <small>entregas patrocinadas simuladas</small>
            </div>
          </div>
          <div className="partner-unavailable">
            <span>CO₂e evitado</span>
            <strong>Não calculado</strong>
            <p>Defina e valide um fator de emissão antes de publicar o valor.</p>
          </div>
        </Card>
      </div>

      <Card className="partner-fiscal">
        <div className="partner-section-heading">
          <div>
            <span className="eyebrow">Validação externa necessária</span>
            <h2>{partnerMessages.fiscalTitle}</h2>
          </div>
          <StatusBadge label="Não disponível" tone="neutral" />
        </div>
        <div className="partner-fiscal__grid">
          <div>
            <span>Benefícios concedidos</span>
            <strong>—</strong>
            <small>sem valor fiscal documentado</small>
          </div>
          <div>
            <span>Comprovantes de campanha</span>
            <strong>{summary.total}</strong>
            <small>registros de resgate disponíveis</small>
          </div>
          <div>
            <span>Benefício fiscal estimado</span>
            <strong>—</strong>
            <small>depende do regime e da validação contábil</small>
          </div>
        </div>
        <p>
          Resgates comprovam o uso da campanha, mas não equivalem
          automaticamente a documento fiscal ou dedução tributária.
        </p>
      </Card>

      <Card className="partner-redemptions">
        <div className="partner-section-heading partner-section-heading--table">
          <div>
            <span className="eyebrow">Rastreabilidade</span>
            <h2>{partnerMessages.redemptionsTitle}</h2>
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
              <Button icon="refresh" onClick={() => void redemptions.refetch()}>
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
                Histórico real de registros de resgate; cada linha informa se o
                cupom é simulado
              </caption>
              <thead>
                <tr>
                  <th scope="col">Cupom</th>
                  <th scope="col">Código</th>
                  <th scope="col">Emissão</th>
                  <th scope="col">Status</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
