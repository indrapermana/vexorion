const menuConfigEvent = 'vexorionerp-menu-config-changed'
let hiddenMenuLinksCache: string[] = []

export function getHiddenMenuLinks() {
  return [...hiddenMenuLinksCache]
}

export function saveHiddenMenuLinks(hiddenLinks: string[]) {
  hiddenMenuLinksCache = [...new Set(hiddenLinks.map((item) => item.trim()).filter((item) => item.length > 0))]

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(menuConfigEvent))
  }
}

export function subscribeToMenuConfigChange(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  const customListener = () => callback()

  window.addEventListener(menuConfigEvent, customListener)

  return () => {
    window.removeEventListener(menuConfigEvent, customListener)
  }
}
