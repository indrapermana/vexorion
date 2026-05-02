import axios, { AxiosError } from 'axios'
import { getApiAccessToken, handleRefresh, handleUnauthorized } from '../apiAuth'
import { posLogger } from '../posLogger'
import type { ValidationProblem } from '../../types/api'

const RETRY_MAX = 3
const RETRY_BASE_DELAY_MS = 1000

function isTransientError(error: AxiosError): boolean {
  // No response at all → network drop / timeout
  if (!error.response) return true
  const { status } = error.response
  // 429 Too Many Requests or any 5xx server error
  return status === 429 || status >= 500
}

function retryDelayMs(attempt: number, error: AxiosError): number {
  // Honour Retry-After header when present (e.g. from 429 responses)
  const retryAfter = error.response?.headers?.['retry-after']
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000
  }
  // Exponential backoff: 1s, 2s, 4s …
  return RETRY_BASE_DELAY_MS * Math.pow(2, attempt)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
})

let refreshPromise: Promise<string | null> | null = null

function shouldBypassRefresh(url?: string) {
  return Boolean(url?.includes('/auth/login') || url?.includes('/auth/refresh'))
}

apiClient.interceptors.request.use((config) => {
  const accessToken = getApiAccessToken()
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error instanceof AxiosError && error.response?.status === 401) {
      const originalRequest = error.config

      if (!originalRequest || shouldBypassRefresh(originalRequest.url)) {
        handleUnauthorized()
        return Promise.reject(error)
      }

      if ((originalRequest as typeof originalRequest & { _retry?: boolean })._retry) {
        handleUnauthorized()
        return Promise.reject(error)
      }

      ;(originalRequest as typeof originalRequest & { _retry?: boolean })._retry = true
      refreshPromise ??= handleRefresh().finally(() => {
        refreshPromise = null
      })

      const nextAccessToken = await refreshPromise
      if (!nextAccessToken) {
        handleUnauthorized()
        return Promise.reject(error)
      }

      originalRequest.headers.set('Authorization', `Bearer ${nextAccessToken}`)
      return apiClient.request(originalRequest)
    }

    return Promise.reject(error)
  },
)

export class ApiError extends Error {
  status: number
  validation?: ValidationProblem

  constructor(status: number, message: string, validation?: ValidationProblem) {
    super(message)
    this.status = status
    this.validation = validation
  }
}

export async function requestJson<T>(path: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET', body?: unknown): Promise<T> {
  let attempt = 0

  for (;;) {
    try {
      const response = await apiClient.request<T>({
        url: path,
        method,
        data: body,
      })

      return response.data
    } catch (error) {
      if (error instanceof AxiosError) {
        if (isTransientError(error) && attempt < RETRY_MAX) {
          const delay = retryDelayMs(attempt, error)
          posLogger.warn('api.retry', {
            path,
            method,
            attempt: attempt + 1,
            status: error.response?.status,
            delayMs: delay,
          })
          await sleep(delay)
          attempt++
          continue
        }

        const status = error.response?.status ?? 500
        const payload = error.response?.data
        const message =
          typeof payload === 'string'
            ? payload
            : payload?.message ?? error.message ?? 'The request could not be completed.'
        const validation =
          payload && typeof payload === 'object' && !Array.isArray(payload)
            ? (payload as ValidationProblem)
            : undefined

        throw new ApiError(status, message, validation)
      }

      throw error
    }
  }
}
