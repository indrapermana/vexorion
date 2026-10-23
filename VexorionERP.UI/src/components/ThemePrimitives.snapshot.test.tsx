/// <reference types="vitest/globals" />

import { render } from '@testing-library/react'
import { VxButton, VxChip, VxCssBaseline, VxStack, VxTextField, VxThemeProvider } from '@vexorion/ui'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import LookupSelectField from './LookupSelectField'
import { createAppTheme } from '../theme'

vi.mock('react-i18next', () => ({
  useTranslation: () => {
    const translations: Record<string, string> = {
      'common.required': 'Required',
      'common.noOptionsAvailable': 'No options available',
    }
    return { t: (key: string) => translations[key] ?? key }
  },
}))

function contrastRatioFor(first: string, second: string, luminance: (hex: string) => number) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

function LookupSelectFieldHarness(props: {
  disabled?: boolean
  error?: boolean
  helperText?: string
  options: Array<{ value: string; label: string }>
}) {
  const [value, setValue] = useState('')

  return (
    <LookupSelectField
      label="Category"
      value={value}
      onChange={setValue}
      options={props.options}
      disabled={props.disabled}
      error={props.error}
      helperText={props.helperText}
    />
  )
}

describe('UI theme primitives snapshots', () => {
  it('uses accessible primary foreground contrast and visible keyboard focus in both themes', () => {
    for (const mode of ['light', 'dark'] as const) {
      const theme = createAppTheme(mode)
      const primary = theme.palette.primary.main
      const foreground = theme.palette.primary.contrastText
      const luminance = (hex: string) => {
        const channels = hex.match(/[a-f\d]{2}/gi)?.map((channel) => parseInt(channel, 16) / 255) ?? []
        const [red, green, blue] = channels.map((channel) => (
          channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
        ))
        return 0.2126 * red + 0.7152 * green + 0.0722 * blue
      }
      const [lighter, darker] = [luminance(primary), luminance(foreground)].sort((a, b) => b - a)
      const contrastRatio = (lighter + 0.05) / (darker + 0.05)
      const focusRule = (theme.components?.MuiCssBaseline?.styleOverrides as Record<string, Record<string, unknown>> | undefined)?.['*:focus-visible']
      const focusColor = focusRule?.outline?.toString().match(/#[a-f\d]{6}/i)?.[0]

      expect(contrastRatio).toBeGreaterThanOrEqual(4.5)
      const backgroundLuminance = luminance(theme.palette.background.default)
      const paperChannels = theme.palette.background.paper.match(/\d+(?:\.\d+)?/g)?.map(Number)
      const paperAlpha = paperChannels?.[3] ?? 1
      if (!paperChannels || paperChannels.length < 3) throw new Error(`Unsupported paper color: ${theme.palette.background.paper}`)
      const paperSurface = `#${paperChannels.slice(0, 3).map((channel, index) => (
        Math.round(channel * paperAlpha + parseInt(theme.palette.background.default.slice(index * 2 + 1, index * 2 + 3), 16) * (1 - paperAlpha))
          .toString(16).padStart(2, '0')
      )).join('')}`
      const paperLuminance = luminance(paperSurface)
      const [lighterPrimary, darkerBackground] = [luminance(primary), backgroundLuminance].sort((a, b) => b - a)
      expect((lighterPrimary + 0.05) / (darkerBackground + 0.05)).toBeGreaterThanOrEqual(4.5)
      const [lighterPrimaryOnPaper, darkerPaper] = [luminance(primary), paperLuminance].sort((a, b) => b - a)
      expect((lighterPrimaryOnPaper + 0.05) / (darkerPaper + 0.05)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatioFor(theme.palette.text.primary, paperSurface, luminance)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatioFor(theme.palette.text.secondary, paperSurface, luminance)).toBeGreaterThanOrEqual(4.5)
      for (const semantic of [
        theme.palette.secondary,
        theme.palette.info,
        theme.palette.success,
        theme.palette.warning,
        theme.palette.error,
      ]) {
        const [lighterSemanticSurface, darkerThemeBackground] = [luminance(semantic.main), backgroundLuminance].sort((a, b) => b - a)
        const [lighterSemanticText, darkerSemanticForeground] = [luminance(semantic.contrastText), luminance(semantic.main)].sort((a, b) => b - a)
        expect((lighterSemanticSurface + 0.05) / (darkerThemeBackground + 0.05)).toBeGreaterThanOrEqual(4.5)
        expect((lighterSemanticText + 0.05) / (darkerSemanticForeground + 0.05)).toBeGreaterThanOrEqual(4.5)
        const [lighterSemanticOnPaper, darkerSemanticPaper] = [luminance(semantic.main), paperLuminance].sort((a, b) => b - a)
        expect((lighterSemanticOnPaper + 0.05) / (darkerSemanticPaper + 0.05)).toBeGreaterThanOrEqual(4.5)
      }
      expect(focusRule).toMatchObject({ outlineOffset: '2px' })
      expect(focusRule?.outline).toMatch(/^3px solid #/)
      if (!focusColor) throw new Error(`No focus outline color configured for ${mode} theme`)
      const focusLuminance = luminance(focusColor)
      const surfaceLuminance = luminance(mode === 'dark' ? '#141226' : '#efeaff')
      const [lighterFocus, darkerFocus] = [focusLuminance, surfaceLuminance].sort((a, b) => b - a)
      expect((lighterFocus + 0.05) / (darkerFocus + 0.05)).toBeGreaterThanOrEqual(3)
    }
  })

  it('matches the light theme button, chip, and input primitives', () => {
    const { asFragment } = render(
      <VxThemeProvider theme={createAppTheme('light')}>
        <VxCssBaseline />
        <VxStack spacing={2} sx={{ p: 2 }}>
          <VxButton variant="contained">Primary Action</VxButton>
          <VxChip color="success" label="Active" />
          <VxTextField label="Workspace name" defaultValue="Acme ERP" helperText="Required" />
        </VxStack>
      </VxThemeProvider>,
    )

    expect(asFragment()).toMatchSnapshot()
  })

  it('matches the dark theme lookup select states', () => {
    const { asFragment } = render(
      <VxThemeProvider theme={createAppTheme('dark')}>
        <VxCssBaseline />
        <VxStack spacing={2} sx={{ p: 2 }}>
          <LookupSelectFieldHarness
            options={[
              { value: 'retail', label: 'Retail' },
              { value: 'wholesale', label: 'Wholesale' },
            ]}
          />
          <LookupSelectFieldHarness
            options={[]}
            disabled
            error
            helperText="No options available"
          />
        </VxStack>
      </VxThemeProvider>,
    )

    expect(asFragment()).toMatchSnapshot()
  })
})