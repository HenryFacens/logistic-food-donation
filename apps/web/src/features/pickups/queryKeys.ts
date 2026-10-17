export const pickupQueryKeys = {
  all: ['pickups'] as const,
  dashboard: (audience: 'driver' | 'ngo') =>
    [...pickupQueryKeys.all, 'dashboard', audience] as const,
  list: (audience: 'driver' | 'ngo') =>
    [...pickupQueryKeys.all, 'list', audience] as const,
}
