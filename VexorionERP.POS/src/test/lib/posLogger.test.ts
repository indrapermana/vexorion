import { describe, it, expect, beforeEach, vi } from 'vitest'

// Access internals via re-import after clearing buffer via monkey-patch
// We test through the public API only.
import { posLogger, type PosLogEntry } from '../../lib/posLogger'

describe('posLogger', () => {
  let captured: { method: string; args: unknown[] }[] = []

  beforeEach(() => {
    captured = []
    vi.spyOn(console, 'info').mockImplementation((...args) => captured.push({ method: 'info', args }))
    vi.spyOn(console, 'warn').mockImplementation((...args) => captured.push({ method: 'warn', args }))
    vi.spyOn(console, 'error').mockImplementation((...args) => captured.push({ method: 'error', args }))
  })

  it('logs info to console.info as JSON', () => {
    posLogger.info('test.event', { foo: 'bar' })
    expect(captured).toHaveLength(1)
    expect(captured[0].method).toBe('info')
    const parsed = JSON.parse(captured[0].args[1] as string) as PosLogEntry
    expect(parsed.level).toBe('info')
    expect(parsed.event).toBe('test.event')
    expect(parsed.data).toEqual({ foo: 'bar' })
    expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('logs warn to console.warn', () => {
    posLogger.warn('warn.event')
    expect(captured[0].method).toBe('warn')
    const parsed = JSON.parse(captured[0].args[1] as string) as PosLogEntry
    expect(parsed.level).toBe('warn')
  })

  it('keeps error entries local and excludes error details', () => {
    posLogger.error('error.event', { code: 500, message: 'sensitive detail' })
    expect(captured).toHaveLength(0)
    const logs = (window as Window & { __posLogs?: () => PosLogEntry[] }).__posLogs!()
    const entry = logs.find((item) => item.event === 'error.event')
    expect(entry).toMatchObject({ level: 'error', event: 'error.event' })
    expect(entry).not.toHaveProperty('data')
  })

  it('exposes __posLogs on window', () => {
    const win = window as Window & { __posLogs?: () => PosLogEntry[] }
    expect(typeof win.__posLogs).toBe('function')
    posLogger.info('window.test')
    const logs = win.__posLogs!()
    expect(logs.some((l) => l.event === 'window.test')).toBe(true)
  })

  it('omits data key when no data is provided', () => {
    posLogger.info('no.data.event')
    const parsed = JSON.parse(captured[0].args[1] as string) as PosLogEntry
    expect('data' in parsed).toBe(false)
  })
})
