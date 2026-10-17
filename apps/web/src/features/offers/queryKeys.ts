export const offerQueryKeys = {
  all: ['offers'] as const,
  list: (status?: string) => [...offerQueryKeys.all, 'list', status || 'all'] as const,
  feed: () => [...offerQueryKeys.all, 'matching-feed'] as const,
}
