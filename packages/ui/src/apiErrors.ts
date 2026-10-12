export type ApiFieldErrors = Record<string, string[]>

export type NormalizedApiError = {
  message: string
  code: string
  traceId?: string
  validation?: ApiFieldErrors
}

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : undefined
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function normalizeFieldErrors(value: unknown): ApiFieldErrors | undefined {
  const record = asRecord(value)
  if (!record) return undefined

  const normalizedErrors: ApiFieldErrors = {}
  Object.entries(record).forEach(([field, messages]) => {
    if (Array.isArray(messages)) {
      const normalized = messages.filter((message): message is string => typeof message === 'string' && Boolean(message.trim()))
      if (normalized.length) normalizedErrors[field] = normalized
      return
    }

    const message = asNonEmptyString(messages)
    if (message) normalizedErrors[field] = [message]
  })

  return Object.keys(normalizedErrors).length ? normalizedErrors : undefined
}

function defaultMessage(status: number): string {
  switch (status) {
    case 0: return 'Unable to reach the server. Check your connection and try again.'
    case 401: return 'Your session has expired. Sign in again to continue.'
    case 403: return 'You do not have permission to perform this action.'
    case 404: return 'The requested resource could not be found.'
    case 409: return 'The request conflicts with the current state. Refresh and try again.'
    case 429: return 'Too many requests were sent. Wait briefly and try again.'
    default:
      return status >= 500
        ? 'An unexpected server error occurred. Try again or contact support.'
        : 'The request could not be completed.'
  }
}

function defaultCode(status: number): string {
  switch (status) {
    case 0: return 'network.unavailable'
    case 401: return 'auth.authentication_required'
    case 403: return 'auth.permission_denied'
    case 404: return 'resource.not_found'
    case 409: return 'resource.conflict'
    case 429: return 'request.rate_limited'
    default: return status >= 500 ? 'server.unexpected_error' : 'request.failed'
  }
}

export function normalizeApiError(
  payload: unknown,
  status: number,
  transportMessage?: string,
): NormalizedApiError {
  if (typeof payload === 'string' && payload.trim()) {
    return { message: payload.trim(), code: defaultCode(status) }
  }

  const record = asRecord(payload)
  const validation = normalizeFieldErrors(record?.errors)
    ?? normalizeFieldErrors(record && !('errors' in record) ? record : undefined)
  const firstValidationMessage = validation ? Object.values(validation).flat()[0] : undefined
  const baseMessage = asNonEmptyString(record?.detail)
    ?? asNonEmptyString(record?.message)
    ?? firstValidationMessage
    ?? asNonEmptyString(record?.title)
    ?? (status === 0 ? undefined : asNonEmptyString(transportMessage))
    ?? defaultMessage(status)
  const traceId = asNonEmptyString(record?.traceId)
  const message = status >= 500 && traceId ? `${baseMessage} Reference: ${traceId}` : baseMessage

  return {
    message,
    code: asNonEmptyString(record?.code) ?? defaultCode(status),
    traceId,
    validation,
  }
}
