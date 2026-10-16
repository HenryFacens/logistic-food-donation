import { Button, EmptyState, LoadingState, SimuladoBadge } from '../../../shared/ui'
import { useCoupons, useRedeemCoupon } from '../api/useCoupons'
import { CouponCard } from '../components/CouponCard'
import { couponMessages } from '../messages'

export function CouponsPage() {
  const coupons = useCoupons()
  const redemption = useRedeemCoupon()

  if (coupons.isPending) return <LoadingState label="Buscando benefícios" />
  if (coupons.isError) {
    return (
      <EmptyState
        action={<Button icon="refresh" onClick={() => void coupons.refetch()}>Tentar novamente</Button>}
        description={couponMessages.loadError}
        icon="warning"
        title="Falha ao carregar"
      />
    )
  }
  if (!coupons.data.items.length) {
    return (
      <EmptyState
        description={couponMessages.emptyDescription}
        icon="coupon"
        title={couponMessages.emptyTitle}
      />
    )
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow">Recompensas por entregas</span>
          <p className="mb-0">Troque seus pontos por benefícios fictícios da demonstração.</p>
        </div>
        <SimuladoBadge />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {coupons.data.items.map((coupon) => (
          <CouponCard
            coupon={coupon}
            key={coupon.id}
            onRedeem={redemption.mutateAsync}
            redeeming={redemption.isPending && redemption.variables === coupon.id}
          />
        ))}
      </div>
    </div>
  )
}
