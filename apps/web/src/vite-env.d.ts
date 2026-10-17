interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_SSE_RETRY_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
