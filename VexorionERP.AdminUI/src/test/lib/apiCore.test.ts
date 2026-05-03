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

  it('maps axios failures into ApiError with status, message, and validation payload', async () => {
    const error = new AxiosError('Request failed')
    error.response = {
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: {},
      config: { headers: {} } as never,
      data: {
        message: 'Validation failed.',
        email: ['Email is required.'],
      },
    }

    vi.spyOn(apiClient, 'request').mockRejectedValueOnce(error)

    await expect(requestJson('/users', 'POST', { email: '' })).rejects.toEqual(
      new ApiError(422, 'Validation failed.', {
        message: 'Validation failed.',
        email: ['Email is required.'],
      }),
    )
  })
})