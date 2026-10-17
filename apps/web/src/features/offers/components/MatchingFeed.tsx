import type { NgoMatchingFeedItem } from '@resgata/shared'
import { AppIcon, LoadingState } from '../../../shared/ui'
import { useMatchingFeed } from '../api/useOffers'

const unitLabels = { box: 'caixas', kg: 'kg', tray: 'bandejas', unit: 'unidades' } as const

const reasonLabels: Record<string, string> = {
  category_not_accepted: 'vocês não recebem esta categoria',
  eta_exceeds_perishability: 'não chegaria antes de estragar',
  insufficient_capacity: 'sem espaço livre hoje',
  outside_receiving_hours: 'fora do horário de recebimento',
  outside_service_radius: 'fora do raio de atendimento',
}

const ago = (iso: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.round(minutes / 60)
  return hours < 24 ? `há ${hours}h` : new Date(iso).toLocaleDateString('pt-BR')
}

function Outcome({ item }: { item: NgoMatchingFeedItem }) {
  if (!item.eligible) {
    return (
      <p className="matching-feed__outcome matching-feed__outcome--out">
        <AppIcon name="warning" size={16} />
        Não entrou:{' '}
        {item.rejectionReasons.map((reason) => reasonLabels[reason] ?? reason).join('; ') ||
          'fora das regras de recebimento'}
      </p>
    )
  }
  if (item.offerStatus) {
    const label = {
      accepted: 'Vocês aceitaram',
      cancelled: 'Oferta cancelada',
      declined: 'Vocês recusaram',
      pending: 'Oferta enviada para vocês',
      timed_out: 'Oferta expirou sem resposta',
    }[item.offerStatus]
    return (
      <p className="matching-feed__outcome matching-feed__outcome--yours">
        <AppIcon name="heart" size={16} />
        {label}
      </p>
    )
  }
  return (
    <p className="matching-feed__outcome">
      <AppIcon name="arrow-right" size={16} />
      Foi para {item.winnerName ?? 'outra ONG'}
      {item.winnerScore !== null ? ` (nota ${Math.round(item.winnerScore)})` : ''}
    </p>
  )
}

/**
 * Every new donation is scored against every NGO in range. This shows the
 * NGO where it landed each time, and why, straight from the matching runs.
 */
export function MatchingFeed() {
  const feed = useMatchingFeed()
  if (feed.isPending) return <LoadingState label="Carregando combinações" />
  if (!feed.data?.items.length) return null

  return (
    <section className="matching-feed" aria-labelledby="matching-feed-title">
      <div>
        <h2 id="matching-feed-title">Combinações recentes</h2>
        <p>
          Cada doação nova da região é comparada com todas as ONGs. A nota vai de 0 a 100:
          solicitação 35%, distância 30%, validade 20% e espaço 15%.
        </p>
      </div>
      <ul className="matching-feed__list">
        {feed.data.items.map((item) => (
          <li className="screen-card matching-feed__item" key={item.donationId}>
            <div className="matching-feed__head">
              <div>
                <strong>{item.description}</strong>
                <span>
                  {item.sellerName} · {item.weightKg.toLocaleString('pt-BR')} kg ·{' '}
                  {item.distanceKm.toLocaleString('pt-BR')} km · {ago(item.runAt)}
                </span>
              </div>
              <span
                className={`matching-feed__score${item.eligible ? '' : ' is-out'}`}
                aria-label={`Nota ${Math.round(item.score)} de 100`}
              >
                {item.eligible ? Math.round(item.score) : '—'}
                <small>{item.eligible ? `${item.rank}ª de ${item.candidates}` : 'fora'}</small>
              </span>
            </div>
            {item.needMatch ? (
              <div className="matching-feed__need">
                <span>
                  Sua solicitação: <strong>{item.needMatch.item}</strong> · aderência{' '}
                  {Math.round(item.needMatch.fit * 100)}%
                  {item.needMatch.coveredQuantity !== null
                    ? ` · cobre ~${item.needMatch.coveredQuantity.toLocaleString('pt-BR')} de ${item.needMatch.remainingQuantity.toLocaleString('pt-BR')} ${unitLabels[item.needMatch.unit]}`
                    : ''}
                </span>
                <q>{item.needMatch.reason}</q>
                <small>
                  {item.needMatch.source === 'claude' ? 'Avaliado pelo Claude' : 'Avaliado por regras'}
                </small>
              </div>
            ) : null}
            <Outcome item={item} />
          </li>
        ))}
      </ul>
    </section>
  )
}
