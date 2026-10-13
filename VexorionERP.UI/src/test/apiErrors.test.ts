import { describe, expect, it } from 'vitest'
import { normalizeApiError } from '@vexorion/ui'

describe('normalizeApiError', () => {
  it.each([
    [401, 'auth.authentication_required'],
    [403, 'auth.permission_denied'],
    [404, 'resource.not_found'],
    [409, 'resource.conflict'],
    [429, 'request.rate_limited'],
  ])('provides a stable fallback for HTTP %s', (status, code) => {
    expect(normalizeApiError(undefined, status)).toMatchObject({ code })
  })

  it('preserves problem details, trace id, and field errors', () => {
    expect(normalizeApiError({
      detail: 'Review the highlighted fields.',
      code: 'validation.failed',
      traceId: 'trace-123',
      errors: { Email: ['Email is invalid.'] },
    }, 400)).toEqual({
      message: 'Review the highlighted fields.',
      code: 'validation.failed',
      traceId: 'trace-123',
      validation: { Email: ['Email is invalid.'] },
    })
  })

  it('adds the trace reference to unexpected server errors', () => {
    expect(normalizeApiError({
      detail: 'An unexpected error occurred.',
      code: 'server.unexpected_error',
      traceId: 'trace-500',
    }, 500).message).toBe('An unexpected error occurred. Reference: trace-500')
  })
})
