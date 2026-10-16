import type { Coupon } from '@resgata/shared'

const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' })

export const couponAvailability = (
  coupon: Coupon,
  now = new Date(),
) => {
  const validFrom = new Date(coupon.validFrom)
  const validUntil = new Date(coupon.validUntil)
  const available =
    coupon.active &&
    coupon.stock > 0 &&
    validFrom.getTime() <= now.getTime() &&
    validUntil.getTime() > now.getTime()

  return {
    available,
    stockLabel: coupon.stock === 1 ? 'Última unidade' : `${coupon.stock} disponíveis`,
    validityLabel: `Válido até ${date.format(validUntil)}`,
  }
}
