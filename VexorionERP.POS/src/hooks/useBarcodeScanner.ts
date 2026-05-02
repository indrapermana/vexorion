import { useEffect, useRef } from 'react'

/** Max milliseconds between keystrokes to still count as barcode scanner input. */
const SCAN_GAP_MS = 80
/** Minimum character count to treat as a valid barcode scan (avoids single-key false positives). */
const SCAN_MIN_LENGTH = 3

/**
 * Attaches a global `keydown` listener that detects rapid keyboard input
 * typical of USB/Bluetooth barcode wedge scanners — characters arriving
 * faster than {@link SCAN_GAP_MS} ms apart, followed by Enter — and calls
 * `onScan` with the accumulated barcode string.
 *
 * Only fires when the active element is NOT an editable field (INPUT,
 * TEXTAREA, SELECT, or contentEditable), so normal typing is unaffected.
 */
export function useBarcodeScanner(onScan: (barcode: string) => void, enabled = true) {
  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)
  // Keep onScan stable in the effect without re-subscribing on every render
  const onScanRef = useRef(onScan)
  useEffect(() => {
    onScanRef.current = onScan
  })

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      const tagName = target.tagName
      // Do not intercept when the user is typing in a form field
      if (
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return
      }

      const now = Date.now()
      const gap = now - lastKeyTimeRef.current
      lastKeyTimeRef.current = now

      // Gap too large → previous partial buffer was not a scan, discard
      if (gap > SCAN_GAP_MS && bufferRef.current.length > 0) {
        bufferRef.current = ''
      }

      if (event.key === 'Enter') {
        const barcode = bufferRef.current.trim()
        bufferRef.current = ''
        if (barcode.length >= SCAN_MIN_LENGTH) {
          onScanRef.current(barcode)
        }
        return
      }

      // Accumulate printable single characters
      if (event.key.length === 1) {
        bufferRef.current += event.key
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled])
}
