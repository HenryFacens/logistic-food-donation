export const couponQueryKeys = {
  all: ['coupons'] as const,
  list: () => [...couponQueryKeys.all, 'list'] as const,
}
