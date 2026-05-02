import { requestJson } from './core'

export function trackPageVisit(path: string) {
  return requestJson<void>('/telemetry/page-visits', 'POST', { path })
}
