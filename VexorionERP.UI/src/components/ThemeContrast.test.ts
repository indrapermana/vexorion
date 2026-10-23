/// <reference types="vitest/globals" />
/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const mainCss = readFileSync(resolve(process.cwd(), 'src/App.css'), 'utf8')
const adminCss = readFileSync(resolve(process.cwd(), '../VexorionERP.AdminUI/src/App.css'), 'utf8')
const mainAuthLayout = readFileSync(resolve(process.cwd(), 'src/components/PublicAuthLayout.tsx'), 'utf8')
const adminAuthLayout = readFileSync(resolve(process.cwd(), '../VexorionERP.AdminUI/src/components/PublicAuthLayout.tsx'), 'utf8')

const lightSurface = '#efeaff'
const darkSurface = '#141226'
const darkShellSurface = '#17132b'
const authGradientBrightestSurface = '#6554c8'

function colorFor(css: string, selector: string, property = 'color') {
  const selectorIndex = css.indexOf(selector)
  const openingBrace = css.indexOf('{', selectorIndex)
  const closingBrace = css.indexOf('}', openingBrace)
  const rule = selectorIndex >= 0 && openingBrace >= 0 && closingBrace >= 0
    ? css.slice(openingBrace + 1, closingBrace)
    : undefined
  const color = rule?.match(new RegExp(`${property}:\\s*(#[\\da-f]{3,8})`, 'i'))?.[1]
  if (!color) throw new Error(`No ${property} color found for CSS selector ${selector}: ${rule ?? 'rule missing'}`)
  return color
}

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

describe('custom shell color contrast', () => {
  it.each([
    ['Main UI', mainCss],
    ['AdminUI', adminCss],
  ])('%s keeps sidebar text and hover labels readable in both themes', (_app, css) => {
    expect(contrastRatio(colorFor(css, '.sidebar-caption')!, lightSurface)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(colorFor(css, '.dashboard-nav-item')!, lightSurface)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(colorFor(css, '.dashboard-nav-item:hover')!, lightSurface)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(colorFor(css, "[data-theme-mode='dark'] .sidebar-caption")!, darkSurface)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(colorFor(css, "[data-theme-mode='dark'] .dashboard-nav-item")!, darkSurface)).toBeGreaterThanOrEqual(4.5)
  })

  it.each([
    ['Main UI', mainCss],
    ['AdminUI', adminCss],
  ])('%s preserves navigation text contrast across hover and active states in dark mode', (_app, css) => {
    for (const selector of [
      "[data-theme-mode='dark'] .dashboard-nav-item",
      "[data-theme-mode='dark'] .dashboard-nav-item:hover",
      "[data-theme-mode='dark'] .dashboard-nav-item-active",
    ]) {
      expect(contrastRatio(colorFor(css, selector)!, darkShellSurface), selector).toBeGreaterThanOrEqual(4.5)
    }
  })

  it.each([
    ['Main UI', mainCss],
    ['AdminUI', adminCss],
  ])('%s keeps public-auth gradient text readable over the brightest radial overlay', (_app, css) => {
    for (const selector of ['.public-shell__eyebrow', '.public-shell__description', '.public-feature-row__description']) {
      const foreground = colorFor(css, selector)
      expect(foreground, selector).toBe('#ffffff')
      expect(contrastRatio(foreground, authGradientBrightestSurface), selector).toBeGreaterThanOrEqual(4.5)
    }
  })

  it.each([
    ['Main UI', mainAuthLayout],
    ['AdminUI', adminAuthLayout],
  ])('%s keeps public-auth brand overlines readable over the brightest radial overlay', (_app, source) => {
    expect(source).toMatch(/variant="overline" sx=\{\{\s*color:\s*'#ffffff'/)
    expect(contrastRatio('#ffffff', authGradientBrightestSurface)).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps Main UI navigation icon accents distinguishable from light and dark surfaces', () => {
    const accents = [
      '.dashboard-nav-item.nav-accent-overview .MuiListItemIcon-root',
      '.dashboard-nav-item.nav-accent-sales .MuiListItemIcon-root',
      '.dashboard-nav-item.nav-accent-procurement .MuiListItemIcon-root',
      '.dashboard-nav-item.nav-accent-inventory .MuiListItemIcon-root',
      '.dashboard-nav-item.nav-accent-finance .MuiListItemIcon-root',
      '.dashboard-nav-item.nav-accent-projects .MuiListItemIcon-root',
      '.dashboard-nav-item.nav-accent-configuration .MuiListItemIcon-root',
    ]

    for (const selector of accents) {
      expect(contrastRatio(colorFor(mainCss, selector)!, lightSurface), selector).toBeGreaterThanOrEqual(3)
      expect(
        contrastRatio(colorFor(mainCss, `[data-theme-mode='dark'] ${selector}`)!, darkSurface),
        `${selector} in dark mode`,
      ).toBeGreaterThanOrEqual(3)
    }
  })
})
