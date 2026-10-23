import { describe, expect, it } from 'vitest'
import { createAppTheme } from '../theme'

function luminance(hex: string) {
  const channels = hex.match(/[a-f\d]{2}/gi)?.map((channel) => parseInt(channel, 16) / 255) ?? []
  const [red, green, blue] = channels.map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ))
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrastRatio(first: string, second: string) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

function compositePaper(background: string, paper: string) {
  const channels = paper.match(/\d+(?:\.\d+)?/g)?.map(Number)
  const backgroundChannels = background.match(/[a-f\d]{2}/gi)?.map((channel) => parseInt(channel, 16))
  if (!channels || channels.length < 3 || !backgroundChannels || backgroundChannels.length < 3) {
    throw new Error(`Unsupported theme surface: ${paper} over ${background}`)
  }

  const alpha = channels[3] ?? 1
  return `#${channels.slice(0, 3).map((channel, index) => (
    Math.round(channel * alpha + backgroundChannels[index] * (1 - alpha)).toString(16).padStart(2, '0')
  )).join('')}`
}

describe('AdminUI theme contrast', () => {
  it.each(['light', 'dark'] as const)('keeps primary and text colors readable in %s mode', (mode) => {
    const theme = createAppTheme(mode)
    const focusRule = (theme.components?.MuiCssBaseline?.styleOverrides as Record<string, Record<string, unknown>>)['*:focus-visible']
    const focusColor = focusRule.outline?.toString().match(/#[a-f\d]{6}/i)?.[0]
    const paperSurface = compositePaper(theme.palette.background.default, theme.palette.background.paper)

    expect(contrastRatio(theme.palette.primary.contrastText, theme.palette.primary.main)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(theme.palette.primary.main, theme.palette.background.default)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(theme.palette.primary.main, paperSurface)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(theme.palette.text.primary, paperSurface)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(theme.palette.text.secondary, paperSurface)).toBeGreaterThanOrEqual(4.5)
    for (const semantic of [
      theme.palette.secondary,
      theme.palette.info,
      theme.palette.success,
      theme.palette.warning,
      theme.palette.error,
    ]) {
      expect(contrastRatio(semantic.main, theme.palette.background.default)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(semantic.main, paperSurface)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(semantic.contrastText, semantic.main)).toBeGreaterThanOrEqual(4.5)
    }
    expect(contrastRatio(theme.palette.text.primary, theme.palette.background.default)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(theme.palette.text.secondary, theme.palette.background.default)).toBeGreaterThanOrEqual(4.5)
    expect(focusRule).toMatchObject({ outlineOffset: '2px' })
    expect(focusRule.outline).toMatch(/^3px solid #/)
    if (!focusColor) throw new Error(`No focus outline color configured for ${mode} theme`)
    expect(contrastRatio(focusColor, theme.palette.background.default)).toBeGreaterThanOrEqual(3)
  })
})
