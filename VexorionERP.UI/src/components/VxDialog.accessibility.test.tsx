/// <reference types="vitest/globals" />

import { render, screen } from '@testing-library/react'
import { VxDialog, VxDialogContent, VxDialogTitle } from '@vexorion/ui'
import { describe, expect, it } from 'vitest'

describe('VxDialog accessibility', () => {
  it('associates the dialog with its title without per-dialog ids', () => {
    render(
      <VxDialog open>
        <VxDialogTitle>Update customer</VxDialogTitle>
        <VxDialogContent>Change the customer details.</VxDialogContent>
      </VxDialog>,
    )

    expect(screen.getByRole('dialog', { name: 'Update customer' })).toHaveAccessibleName('Update customer')
  })
})
