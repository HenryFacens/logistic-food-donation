export type QueryScope =
  | 'admin'
  | 'coupons'
  | 'donations'
  | 'impact'
  | 'offers'
  | 'partner'
  | 'pickups'
  | 'session'

export interface QueryInvalidator {
  invalidate(scopes: readonly QueryScope[]): Promise<void> | void
}

export const noopQueryInvalidator: QueryInvalidator = {
  invalidate: () => undefined,
}

