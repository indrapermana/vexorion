/// <reference types="vitest/globals" />

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { VxConfirmActionButton, VxConfirmActionDialog } from '@vexorion/ui'

describe('VxConfirmAction', () => {
  it('names the target, explains the consequence, and gives cancel safe focus', () => {
    render(
      <VxConfirmActionDialog
        open
        title="Delete account"
        targetName="1000 — Cash"
        consequence="This permanently removes the account."
        confirmLabel="Delete account"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByText('1000 — Cash')).toBeInTheDocument()
    expect(screen.getByText('This permanently removes the account.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('locks controls while processing and keeps failures available for retry', async () => {
    let rejectAction: ((error: Error) => void) | undefined
    const onConfirm = vi.fn(() => new Promise<void>((_, reject) => { rejectAction = reject }))

    render(
      <VxConfirmActionButton
        title="Delete line"
        targetName="Widget"
        consequence="The total will be recalculated."
        confirmLabel="Delete line"
        pendingLabel="Deleting..."
        onConfirm={onConfirm}
      >Delete</VxConfirmActionButton>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete line' }))
    expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()

    rejectAction?.(new Error('Still referenced by a posted invoice.'))
    await waitFor(() => expect(screen.getByText('Still referenced by a posted invoice.')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Delete line' })).toBeEnabled()
  })
})
