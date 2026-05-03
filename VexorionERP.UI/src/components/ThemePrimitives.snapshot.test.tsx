/// <reference types="vitest/globals" />

import { render } from '@testing-library/react'
import { Button, Chip, CssBaseline, Stack, TextField, ThemeProvider } from '@mui/material'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import LookupSelectField from './LookupSelectField'
import { createAppTheme } from '../theme'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
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
      <ThemeProvider theme={createAppTheme('light')}>
        <CssBaseline />
        <Stack spacing={2} sx={{ p: 2 }}>
          <Button variant="contained">Primary Action</Button>
          <Chip color="success" label="Active" />
          <TextField label="Workspace name" defaultValue="Acme ERP" helperText="Required" />
        </Stack>
      </ThemeProvider>,
    )

    expect(asFragment()).toMatchSnapshot()
  })

  it('matches the dark theme lookup select states', () => {
    const { asFragment } = render(
      <ThemeProvider theme={createAppTheme('dark')}>
        <CssBaseline />
        <Stack spacing={2} sx={{ p: 2 }}>
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
        </Stack>
      </ThemeProvider>,
    )

    expect(asFragment()).toMatchSnapshot()
  })
})