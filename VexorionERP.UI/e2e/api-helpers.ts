import { expect, type Page } from '@playwright/test'

export type ApiResult<T> = {
  status: number
  body: T | null
}

export type CreatedEntity = {
  id: string
}

export async function authenticatedApi<T>(
  page: Page,
  path: string,
  method: 'GET' | 'POST' | 'DELETE',
  body?: unknown,
): Promise<ApiResult<T>> {
  return page.evaluate(async ({ requestPath, requestMethod, requestBody }) => {
    const persistedAuth = window.localStorage.getItem('vexorionerp.auth')
    const accessToken = persistedAuth
      ? (JSON.parse(persistedAuth) as { state?: { session?: { accessToken?: string } } }).state?.session?.accessToken
      : undefined

    if (!accessToken) {
      throw new Error('Authenticated E2E session is missing its access token.')
    }

    const response = await window.fetch(`/api${requestPath}`, {
      method: requestMethod,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(requestBody === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: requestBody === undefined ? undefined : JSON.stringify(requestBody),
    })
    const text = await response.text()

    return {
      status: response.status,
      body: text ? JSON.parse(text) : null,
    }
  }, { requestPath: path, requestMethod: method, requestBody: body }) as Promise<ApiResult<T>>
}

export function expectSuccessfulFixture<T>(result: ApiResult<T>, operation: string): T {
  expect(result.status, `${operation} failed: ${JSON.stringify(result.body)}`).toBeGreaterThanOrEqual(200)
  expect(result.status, `${operation} failed: ${JSON.stringify(result.body)}`).toBeLessThan(300)
  expect(result.body, `${operation} returned no response body`).not.toBeNull()
  return result.body as T
}
