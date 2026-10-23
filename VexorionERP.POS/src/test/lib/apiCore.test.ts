import axios from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, reportClientDiagnostic } from '../../lib/api/core'
import { setApiAccessToken } from '../../lib/apiAuth'

describe('client diagnostics', () => {
  afterEach(() => {
    setApiAccessToken(null)
    vi.restoreAllMocks()
  })

  it('reports network failures without including raw error details', () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValueOnce({} as never)
    setApiAccessToken('test-access-token')

    reportClientDiagnostic('api.network-error', new ApiError(0, 'network failure with sensitive details'))

    expect(post.mock.calls[0][1]).toEqual({
      application: 'pos',
      eventName: 'api.network-error',
      apiStatus: 0,
      apiCode: 'request.failed',
    })
  })
})
