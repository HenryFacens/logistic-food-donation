import { Button, EmptyState, LoadingState, SimuladoBadge } from '../../../shared/ui'
import { useCoupons, useRedeemCoupon } from '../api/useCoupons'
import { CouponCard } from '../components/CouponCard'
import { couponMessages } from '../messages'
import { couponAvailability } from '../viewModels'
import '../coupons.css'

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

  const availableCount = coupons.data.items.filter(
    (coupon) => couponAvailability(coupon).available,
  ).length

  return (
    <div className="coupons-screen">
      <header className="coupons-screen__header">
        <div>
          <span className="eyebrow">Recompensas por entregas</span>
          <h1>Cupons</h1>
          <p>{couponMessages.simulationDescription}</p>
        </div>
        <SimuladoBadge />
      </header>
      <section className="coupons-screen__summary" aria-label="Resumo dos benefícios">
        <span>
          <strong>{availableCount}</strong>
          benefícios disponíveis
        </span>
        <span>
          <strong>{coupons.data.items.length}</strong>
          opções na carteira
        </span>
      </section>
      <div className="coupons-screen__list">
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
