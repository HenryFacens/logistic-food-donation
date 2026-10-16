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
  400: 'A solicitação contém dados inválidos.',
  401: 'Selecione novamente um perfil de demonstração.',
  403: 'Este perfil não pode executar esta ação.',
  404: 'O recurso solicitado não foi encontrado.',
  409: 'Os dados mudaram. Atualize a tela e tente novamente.',
  422: 'Revise os campos informados e tente novamente.',
  429: 'Muitas solicitações. Aguarde um instante e tente novamente.',
  500: 'O serviço encontrou um erro inesperado.',
  502: 'O serviço está temporariamente indisponível.',
  503: 'O serviço está temporariamente indisponível.',
  504: 'O serviço demorou demais para responder.',
}

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
  return new ApiClientError({
    code: apiError?.code,
    correlationId: apiError?.correlationId,
    details: apiError?.details,
    kind: kindFromStatus(response.status),
    message:
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
