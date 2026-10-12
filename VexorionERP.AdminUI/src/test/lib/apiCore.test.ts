import { AxiosError } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiClient, requestJson } from '../../lib/api/core'

describe('requestJson', () => {
  afterEach(() => {
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
})
