import type { Coupon, CouponRedemption } from '@resgata/shared'
import { useState } from 'react'
import {
  AppIcon,
  Button,
  Card,
  SimuladoBadge,
  StatusBadge,
} from '../../../shared/ui'
import { couponErrorMessage, couponMessages } from '../messages'
import { couponAvailability } from '../viewModels'

interface CouponCardProps {
  coupon: Coupon
  redeeming: boolean
  onRedeem(couponId: string): Promise<CouponRedemption>
}

export function CouponCard({
  coupon,
  onRedeem,
  redeeming,
}: CouponCardProps) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [redemption, setRedemption] = useState<CouponRedemption | null>(null)
  const availability = couponAvailability(coupon)

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
    <Card className="coupon-card">
      <div className="coupon-card__topline">
        <span className="coupon-card__icon">
          <AppIcon name="coupon" size={26} />
        </span>
        <div className="coupon-card__badges">
          <SimuladoBadge />
          <StatusBadge
            label={availability.available ? 'Disponível' : 'Indisponível'}
            tone={availability.available ? 'success' : 'danger'}
          />
        </div>
      </div>

      <div className="coupon-card__title">
        <span className="eyebrow">Benefício parceiro</span>
        <h2>{coupon.title}</h2>
        <p>{coupon.description}</p>
      </div>

      <div className="coupon-card__facts">
        <div>
          <span>Custo</span>
          <strong>{coupon.pointsCost} pts</strong>
        </div>
        <div>
          <span>Estoque</span>
          <strong>{availability.stockLabel}</strong>
        </div>
      </div>

      <div className="coupon-card__terms">
        <strong><AppIcon name="clock" size={17} />{availability.validityLabel}</strong>
        <span>{coupon.terms}</span>
      </div>

      {redemption ? (
        <output className="coupon-card__redemption">
          <span className="eyebrow">Código emitido</span>
          <strong>{redemption.redemptionCode}</strong>
          <p>Apresente ao parceiro. Benefício e parceiro são simulados.</p>
        </output>
      ) : null}

      {confirming && !redemption ? (
        <div className="coupon-card__confirmation">
          <p>
            O resgate consumirá <strong>{coupon.pointsCost} pontos</strong>. Esta operação não pode ser desfeita pela interface.
          </p>
          <div>
            <Button disabled={redeeming} onClick={() => setConfirming(false)} variant="ghost">Cancelar</Button>
            <Button disabled={redeeming} icon="check" onClick={() => void redeem()} variant="primary">
              Emitir cupom
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mb-0 text-sm font-bold text-[rgb(var(--color-danger))]" role="alert">{error}</p> : null}

      {!confirming && !redemption ? (
        <Button
          className="coupon-card__action"
          disabled={!availability.available || redeeming}
          icon="coupon"
          onClick={() => setConfirming(true)}
          variant="primary"
        >
          Resgatar benefício
        </Button>
      ) : null}
    </Card>
  )
}
