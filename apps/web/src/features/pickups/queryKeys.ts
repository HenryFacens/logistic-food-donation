export const pickupQueryKeys = {
  all: ['pickups'] as const,
  dashboard: (audience: 'driver' | 'ngo') =>
    [...pickupQueryKeys.all, 'dashboard', audience] as const,
  list: (audience: 'driver' | 'ngo') =>
    [...pickupQueryKeys.all, 'list', audience] as const,
  profile: () => [...pickupQueryKeys.all, 'profile'] as const,
  routePlan: (signature: string) =>
    [...pickupQueryKeys.all, 'route-plan', signature] as const,
}
