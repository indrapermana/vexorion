import '@testing-library/jest-dom'

// jsdom does not implement window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Stub window.print (used by printReceipt)
Object.defineProperty(window, 'print', { writable: true, value: vi.fn() })

// Stub window.open (used by printReceipt for pop-up print window)
Object.defineProperty(window, 'open', { writable: true, value: vi.fn(() => null) })

// Stub crypto.randomUUID (not available in jsdom)
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () =>
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.floor(Math.random() * 16)
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      }),
  },
})

// Clear localStorage between tests to isolate Zustand persist stores
afterEach(() => {
  localStorage.clear()
})
