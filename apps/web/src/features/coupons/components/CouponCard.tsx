import type { Coupon, CouponRedemption } from '@resgata/shared'
import { useState } from 'react'
import {
  AppIcon,
  Button,
  Card,
  MetricValue,
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
    <Card className="grid gap-4 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-raised text-text">
          <AppIcon name="coupon" size={26} />
        </span>
        <div className="flex flex-wrap justify-end gap-2">
          <SimuladoBadge />
          <StatusBadge
            label={availability.available ? 'Disponível' : 'Indisponível'}
            tone={availability.available ? 'success' : 'danger'}
          />
        </div>
      </div>

      <div>
        <span className="eyebrow">Benefício parceiro</span>
        <h2 className="mb-1 text-xl">{coupon.title}</h2>
        <p className="mb-0">{coupon.description}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-border p-3">
          <span className="block text-xs font-medium text-muted">Custo</span>
          <strong className="block"><MetricValue value={`${coupon.pointsCost} pts`} /></strong>
        </div>
        <div className="col-span-2 rounded-xl border border-border p-3">
          <span className="block text-xs font-medium text-muted">Estoque</span>
          <strong className="block"><MetricValue value={availability.stockLabel} /></strong>
        </div>
      </div>

      <div className="text-sm">
        <strong className="block">{availability.validityLabel}</strong>
        <span className="text-[rgb(var(--color-muted))]">{coupon.terms}</span>
      </div>

      {redemption ? (
        <output className="block rounded-2xl border-2 border-dashed border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary)/0.08)] p-4 text-center">
          <span className="eyebrow">Código emitido</span>
          <strong className="metric-value block break-all text-2xl tracking-wider">{redemption.redemptionCode}</strong>
          <p className="mb-0 mt-2 text-sm">Apresente ao parceiro. Benefício e parceiro são simulados.</p>
        </output>
      ) : null}

      {confirming && !redemption ? (
        <div className="grid gap-3 rounded-2xl border border-[rgb(var(--color-border))] p-4">
          <p className="mb-0 text-sm">
            O resgate consumirá <strong>{coupon.pointsCost} pontos</strong>. Esta operação não pode ser desfeita pela interface.
          </p>
          <div className="grid grid-cols-2 gap-3">
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
