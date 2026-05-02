type UnauthorizedHandler = () => void
type RefreshHandler = () => Promise<string | null>

let accessToken: string | null = null
let onUnauthorized: UnauthorizedHandler | null = null
let onRefresh: RefreshHandler | null = null

export function setApiAccessToken(token: string | null) {
  accessToken = token
}

export function getApiAccessToken() {
  return accessToken
}

export function setApiUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler
}

export function setApiRefreshHandler(handler: RefreshHandler | null) {
  onRefresh = handler
}

export function handleUnauthorized() {
  onUnauthorized?.()
}

export function handleRefresh() {
  return onRefresh?.() ?? Promise.resolve(null)
}
