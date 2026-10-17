import { driverStatusSchema } from '@resgata/shared'
import { useQuery } from '@tanstack/react-query'
import { useApiClient } from '../../../shared/api'
import { Button, EmptyState, LoadingState } from '../../../shared/ui'
import { useCoupons, useRedeemCoupon } from '../api/useCoupons'
import { CouponCard } from '../components/CouponCard'
import { couponMessages } from '../messages'
import '../coupons.css'

export function CouponsPage() {
  const api = useApiClient()
  const coupons = useCoupons()
  const redemption = useRedeemCoupon()
  // Same query key as the driver availability card, so both stay in sync.
  const driver = useQuery({
    queryKey: ['driver-status'],
    queryFn: async () => driverStatusSchema.parse(await api.get('/drivers/me')),
  })
  const points = driver.data?.points

  if (coupons.isPending) return <LoadingState label="Buscando prêmios" />
  if (coupons.isError && !coupons.data) {
    return (
      <EmptyState
        action={<Button icon="refresh" onClick={() => void coupons.refetch()}>Tentar novamente</Button>}
        description={couponMessages.loadError}
        icon="warning"
        title="Não foi possível carregar os prêmios"
      />
    )
  }

  // What the driver can take now comes first, then the cheapest to unlock.
  const items = [...coupons.data.items].sort((left, right) => {
    const reach = (cost: number) => (points !== undefined && cost <= points ? 0 : 1)
    return reach(left.pointsCost) - reach(right.pointsCost) || left.pointsCost - right.pointsCost
  })

  return (
    <div className="coupons-screen">
      <header className="coupons-screen__header">
        <h1>Prêmios</h1>
        <p>{couponMessages.description}</p>
      </header>

      {points !== undefined ? (
        <section className="coupons-balance" aria-label="Seus pontos">
          <span>Você tem</span>
          <strong>
            {points.toLocaleString('pt-BR')} <small>pontos</small>
          </strong>
        </section>
      ) : null}

      {items.length ? (
        <div className="coupons-screen__list">
          {items.map((coupon) => (
            <CouponCard
              coupon={coupon}
              key={coupon.id}
              onRedeem={redemption.mutateAsync}
              points={points}
              redeeming={redemption.isPending && redemption.variables === coupon.id}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          description={couponMessages.emptyDescription}
          icon="coupon"
          title={couponMessages.emptyTitle}
        />
      )}
    </div>
  )
}
