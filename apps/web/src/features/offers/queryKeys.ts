export const offerQueryKeys = {
  all: ['offers'] as const,
  list: (status?: string) => [...offerQueryKeys.all, 'list', status || 'all'] as const,
}
