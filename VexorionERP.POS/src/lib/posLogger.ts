/**
 * Lightweight structured logger for POS client-side observability.
 * Logs are written to the console as structured JSON and buffered in a
 * fixed-size ring buffer (last 200 entries) for in-session inspection.
 *
 * Access the buffer from DevTools: window.__posLogs()
 */

export type PosLogLevel = 'info' | 'warn' | 'error'

export interface PosLogEntry {
  timestamp: string
  level: PosLogLevel
  event: string
  data?: Record<string, unknown>
}

const RING_BUFFER_SIZE = 200
const _buffer: PosLogEntry[] = []

function push(entry: PosLogEntry) {
  if (_buffer.length >= RING_BUFFER_SIZE) {
    _buffer.shift()
  }
  _buffer.push(entry)
}

function log(level: PosLogLevel, event: string, data?: Record<string, unknown>) {
  const entry: PosLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...(data !== undefined && level !== 'error' ? { data } : {}),
  }

  push(entry)

  const output = JSON.stringify(entry)
  if (level === 'warn') {
    console.warn('[POS]', output)
  } else if (level === 'info') {
    console.info('[POS]', output)
  }
}

export const posLogger = {
  info: (event: string, data?: Record<string, unknown>) => log('info', event, data),
  warn: (event: string, data?: Record<string, unknown>) => log('warn', event, data),
  error: (event: string, data?: Record<string, unknown>) => log('error', event, data),
}

// Expose buffer accessor on window for DevTools inspection
if (typeof window !== 'undefined') {
  ;(window as Window & { __posLogs?: () => PosLogEntry[] }).__posLogs = () => [..._buffer]
}
