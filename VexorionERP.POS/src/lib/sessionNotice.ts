const SESSION_EXPIRED_KEY = 'vexorionerp.pos.sessionExpired'

export function markSessionExpired() {
  try {
    window.sessionStorage.setItem(SESSION_EXPIRED_KEY, '1')
  } catch {
    // Storage can be unavailable; the sign-in page then simply omits the notice.
  }
}

export function consumeSessionExpired() {
  try {
    const expired = window.sessionStorage.getItem(SESSION_EXPIRED_KEY) === '1'
    window.sessionStorage.removeItem(SESSION_EXPIRED_KEY)
    return expired
  } catch {
    return false
  }
}
