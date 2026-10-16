const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

export const env = {
  apiBaseUrl: trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || '/api'),
  sseRetryMs: Number(import.meta.env.VITE_SSE_RETRY_MS || 3_000),
} as const

