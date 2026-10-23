import axios from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, reportClientDiagnostic } from '../lib/api/core'
import { setApiAccessToken } from '../lib/apiAuth'

describe('client diagnostics', () => {
  afterEach(() => {
    setApiAccessToken(null)
    vi.restoreAllMocks()
  })

  it('reports sanitized server errors with their support trace ID', () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValueOnce({} as never)
    setApiAccessToken('test-access-token')

    reportClientDiagnostic(
      'api.server-error',
      new ApiError(500, 'sensitive exception text', 'server.unexpected_error', undefined, 'trace-123'),
    )

    expect(post.mock.calls[0][1]).toEqual({
      application: 'main-ui',
      eventName: 'api.server-error',
      apiStatus: 500,
      apiCode: 'server.unexpected_error',
      clientTraceId: 'trace-123',
    })
    expect(JSON.stringify(post.mock.calls[0][1])).not.toContain('sensitive')
  })
})
