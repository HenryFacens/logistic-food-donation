import type { Coupon, CouponRedemption } from '@resgata/shared'
import { useState } from 'react'
import { AppIcon, Button } from '../../../shared/ui'
import { couponErrorMessage, couponMessages } from '../messages'
import { couponAvailability } from '../viewModels'

interface CouponCardProps {
  coupon: Coupon
  /** Driver's balance; undefined while loading. */
  points?: number
  redeeming: boolean
  onRedeem(couponId: string): Promise<CouponRedemption>
}

export function CouponCard({ coupon, onRedeem, points, redeeming }: CouponCardProps) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [redemption, setRedemption] = useState<CouponRedemption | null>(null)
  const availability = couponAvailability(coupon)
  const missing = points === undefined ? 0 : Math.max(0, coupon.pointsCost - points)
  const affordable = availability.available && missing === 0

  const redeem = async () => {
    setError(null)
    try {
      setRedemption(await onRedeem(coupon.id))
      setConfirming(false)
    } catch (caught) {
      setError(couponErrorMessage(caught, couponMessages.redeemError))
    }
  }

  return (
    <article className={`screen-card coupon-card${affordable ? ' is-affordable' : ''}`}>
      <div className="coupon-card__main">
        <div className="coupon-card__title">
          <h2>{coupon.title}</h2>
          <p>{coupon.description}</p>
          <small>
            {coupon.terms} {availability.validityLabel}.
          </small>
        </div>
        <strong className="coupon-card__cost">
          {coupon.pointsCost}
          <small>pts</small>
        </strong>
      </div>

      {redemption ? (
        <output className="coupon-card__redemption">
          <span>Seu código</span>
          <strong className="code-value">{redemption.redemptionCode}</strong>
          <p>Mostre este código no parceiro para usar o benefício.</p>
        </output>
      ) : null}

      {confirming && !redemption ? (
        <div className="coupon-card__confirmation">
          <p>
            Trocar <strong>{coupon.pointsCost} pontos</strong> por este benefício? Não dá para desfazer.
          </p>
          <div>
            <Button disabled={redeeming} onClick={() => setConfirming(false)} variant="secondary">
              Voltar
            </Button>
            <Button disabled={redeeming} icon="check" onClick={() => void redeem()} variant="primary">
              {redeeming ? 'Trocando…' : 'Sim, trocar'}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="coupon-card__error" role="alert">
          {error}
        </p>
      ) : null}

      {!confirming && !redemption ? (
        affordable ? (
          <Button icon="coupon" onClick={() => setConfirming(true)} variant="primary">
            Trocar por {coupon.pointsCost} pts
          </Button>
        ) : (
          <p className="coupon-card__locked">
            <AppIcon name="clock" size={18} />
            {!availability.available
              ? 'Esgotado no momento'
              : `Faltam ${missing} pts. Faça mais entregas para liberar.`}
          </p>
        )
      ) : null}
    </article>
  )
}
