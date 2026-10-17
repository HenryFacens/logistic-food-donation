import type { ApiError } from '@resgata/shared'

export type ApiErrorKind =
  | 'conflict'
  | 'network'
  | 'not-found'
  | 'server'
  | 'unauthorized'
  | 'unknown'
  | 'validation'

interface ApiClientErrorOptions {
  cause?: unknown
  code?: string
  correlationId?: string
  details?: Record<string, unknown>
  kind: ApiErrorKind
  message: string
  status?: number
}

export class ApiClientError extends Error {
  readonly code?: string
  readonly correlationId?: string
  readonly details?: Record<string, unknown>
  readonly kind: ApiErrorKind
  readonly retryable: boolean
  readonly status?: number

  constructor(options: ApiClientErrorOptions) {
    super(options.message, { cause: options.cause })
    this.name = 'ApiClientError'
    this.code = options.code
    this.correlationId = options.correlationId
    this.details = options.details
    this.kind = options.kind
    this.status = options.status
    this.retryable =
      options.kind === 'network' ||
      options.kind === 'server' ||
      options.status === 429
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Algum dado está errado. Confira e tente de novo.',
  401: 'Sua sessão terminou. Escolha seu perfil de novo.',
  403: 'Seu perfil não pode fazer isso.',
  404: 'Não encontramos isso. Talvez já tenha sido removido.',
  409: 'Alguém mudou isso antes de você. Atualize a tela e tente de novo.',
  422: 'Confira os campos marcados e tente de novo.',
  429: 'Muitas tentativas seguidas. Espere um pouco e tente de novo.',
  500: 'Algo deu errado do nosso lado. Tente de novo em instantes.',
  502: 'O serviço está fora do ar por um momento. Tente de novo em instantes.',
  503: 'O serviço está fora do ar por um momento. Tente de novo em instantes.',
  504: 'A conexão está lenta. Tente de novo.',
}

const TECHNICAL_CODES = new Set([
  'invalid_cursor',
  'invalid_json',
  'invalid_route',
  'validation_error',
])

const kindFromStatus = (status: number): ApiErrorKind => {
  if (status === 401 || status === 403) return 'unauthorized'
  if (status === 404) return 'not-found'
  if (status === 409) return 'conflict'
  if (status === 400 || status === 422) return 'validation'
  if (status >= 500) return 'server'
  return 'unknown'
}

const isApiError = (value: unknown): value is ApiError => {
  if (!value || typeof value !== 'object' || !('error' in value)) return false
  const error = value.error
  return (
    error !== null &&
    error !== undefined &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  )
}

export const normalizeResponseError = async (
  response: Response,
): Promise<ApiClientError> => {
  let body: unknown
  try {
    body = await response.clone().json()
  } catch {
    body = undefined
  }

  const apiError = isApiError(body) ? body.error : undefined
  // The API writes specific pt-BR messages for business errors ("Código de
  // confirmação inválido."); show those. Technical ones and server errors
  // fall back to the plain status text.
  const specific =
    apiError &&
    response.status >= 400 &&
    response.status < 500 &&
    !TECHNICAL_CODES.has(apiError.code)
      ? apiError.message
      : undefined
  return new ApiClientError({
    code: apiError?.code,
    correlationId: apiError?.correlationId,
    details: apiError?.details,
    kind: kindFromStatus(response.status),
    message:
      specific ||
      STATUS_MESSAGES[response.status] ||
      apiError?.message ||
      'Não foi possível concluir a solicitação.',
    status: response.status,
  })
}

export const normalizeUnknownError = (error: unknown): ApiClientError => {
  if (error instanceof ApiClientError) return error
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiClientError({
      cause: error,
      kind: 'network',
      message: 'A solicitação foi cancelada.',
    })
  }
  return new ApiClientError({
    cause: error,
    kind: 'network',
    message: 'Sem conexão com o serviço. Verifique sua internet e tente novamente.',
  })
}
