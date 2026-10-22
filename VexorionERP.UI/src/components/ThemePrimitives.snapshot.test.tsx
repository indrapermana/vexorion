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