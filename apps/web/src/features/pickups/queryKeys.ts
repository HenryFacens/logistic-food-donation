export const pickupQueryKeys = {
  all: ['pickups'] as const,
  list: (audience: 'driver' | 'ngo') =>
    [...pickupQueryKeys.all, 'list', audience] as const,
}
