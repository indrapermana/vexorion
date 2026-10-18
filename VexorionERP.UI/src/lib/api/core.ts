import axios, { AxiosError } from 'axios'
import { normalizeApiError, type ApiFieldErrors } from '@vexorion/ui'
import { getApiAccessToken, handleRefresh, handleUnauthorized } from '../apiAuth'

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
  code: string
  traceId?: string
  validation?: ApiFieldErrors

  constructor(status: number, message: string, code = 'request.failed', validation?: ApiFieldErrors, traceId?: string) {
    super(message)
    this.status = status
    this.code = code
    this.validation = validation
    this.traceId = traceId
  }
}

export function toApiError(error: unknown): Error {
  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 0
    const normalized = normalizeApiError(error.response?.data, status, error.message)
    return new ApiError(status, normalized.message, normalized.code, normalized.validation, normalized.traceId)
  }

  return error instanceof Error ? error : new Error('The request could not be completed.')
}

export async function requestJson<T>(path: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET', body?: unknown): Promise<T> {
  try {
    const response = await apiClient.request<T>({
      url: path,
      method,
      data: body,
    })

    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}
