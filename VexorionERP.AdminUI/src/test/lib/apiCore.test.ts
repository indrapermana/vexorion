import axios from 'axios'
import { AxiosError } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiClient, reportClientDiagnostic, requestJson } from '../../lib/api/core'
import { setApiAccessToken } from '../../lib/apiAuth'

describe('requestJson', () => {
  afterEach(() => {
    setApiAccessToken(null)
    vi.restoreAllMocks()
  })

  it('returns response data when the request succeeds', async () => {
    vi.spyOn(apiClient, 'request').mockResolvedValueOnce({
      data: { id: 'user-1', name: 'Alice' },
    } as never)

    await expect(requestJson('/users')).resolves.toEqual({ id: 'user-1', name: 'Alice' })
  })

  it('maps problem details into ApiError with status, code, trace id, and field errors', async () => {
    const error = new AxiosError('Request failed')
    error.response = {
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: {},
      config: { headers: {} } as never,
      data: {
        title: 'Validation failed',
        detail: 'Review the highlighted fields.',
        code: 'validation.failed',
        traceId: 'trace-123',
        errors: { email: ['Email is required.'] },
      },
    }

    vi.spyOn(apiClient, 'request').mockRejectedValueOnce(error)

    await expect(requestJson('/users', 'POST', { email: '' })).rejects.toEqual(
      new ApiError(
        422,
        'Review the highlighted fields.',
        'validation.failed',
        { email: ['Email is required.'] },
        'trace-123',
      ),
    )
  })

  it('provides an actionable message when the server cannot be reached', async () => {
    vi.spyOn(apiClient, 'request').mockRejectedValueOnce(new AxiosError('Network Error'))

    await expect(requestJson('/users')).rejects.toMatchObject({
      status: 0,
      code: 'network.unavailable',
      message: 'Unable to reach the server. Check your connection and try again.',
    })
  })

  it('sends only sanitized diagnostic metadata to the protected endpoint', () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValueOnce({} as never)
    setApiAccessToken('test-access-token')

    reportClientDiagnostic(
      'api.server-error',
      new ApiError(500, 'sensitive exception text', 'request.failed', { password: ['sensitive field value'] }, 'trace-123'),
    )

    const [url, payload, config] = post.mock.calls[0]
    expect(url).toMatch(/\/api\/telemetry\/client-errors$/)
    expect(payload).toEqual({
      application: 'admin-ui',
      eventName: 'api.server-error',
      apiStatus: 500,
      apiCode: 'request.failed',
      clientTraceId: 'trace-123',
    })
    expect(JSON.stringify(payload)).not.toContain('sensitive')
    expect(config?.headers).toMatchObject({ Authorization: 'Bearer test-access-token' })
  })

  it('does not send expected client-side API errors as diagnostics', () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValueOnce({} as never)
    setApiAccessToken('test-access-token')

    reportClientDiagnostic('operation.failed', new ApiError(422, 'validation failed', 'validation.failed'))

    expect(post).not.toHaveBeenCalled()
  })
})
