import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { createMemoryRouter, Link, Route, Routes, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { UnsavedChangesNavigationGuard, useUnsavedChangesPrompt } from './useUnsavedChangesPrompt'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@vexorion/ui', () => ({
  VxButton: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { color?: string, variant?: string }) => (
    <button type="button" {...props}>{children}</button>
  ),
  VxDialog: ({ open, children }: { open: boolean, children: ReactNode }) => (
    open ? <section role="dialog">{children}</section> : null
  ),
  VxDialogActions: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  VxDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  VxDialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}))

function PromptHarness({ isDirty, isBusy, onClose, onDiscard }: {
  isDirty: boolean
  isBusy: boolean
  onClose: () => void
  onDiscard?: () => void
}) {
  const { requestClose, confirmationDialog } = useUnsavedChangesPrompt(isDirty, isBusy, onClose, onDiscard)

  return (
    <>
      <button type="button" onClick={requestClose}>Close editor</button>
      {confirmationDialog}
    </>
  )
}

function DirtyNavigationPage() {
  const { confirmationDialog } = useUnsavedChangesPrompt(true, false, vi.fn())

  return (
    <>
      <Link to="/next">Navigate away</Link>
      {confirmationDialog}
    </>
  )
}

function NavigationGuardHarness() {
  return (
    <UnsavedChangesNavigationGuard>
      <Routes>
        <Route path="/" element={<DirtyNavigationPage />} />
        <Route path="/next" element={<div>Next page</div>} />
      </Routes>
    </UnsavedChangesNavigationGuard>
  )
}

describe('useUnsavedChangesPrompt', () => {
  it('closes a clean editor immediately', async () => {
    const onClose = vi.fn()
    render(<PromptHarness isDirty={false} isBusy={false} onClose={onClose} />)

    await userEvent.click(screen.getByRole('button', { name: 'Close editor' }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('lets the user keep editing or explicitly discard dirty changes', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onDiscard = vi.fn()
    render(
      <PromptHarness
        isDirty={true}
        isBusy={false}
        onClose={onClose}
        onDiscard={onDiscard}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Close editor' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('common.unsavedChanges.message')
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'common.unsavedChanges.keepEditing' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(onDiscard).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Close editor' }))
    await user.click(screen.getByRole('button', { name: 'common.unsavedChanges.discard' }))

    expect(onDiscard).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not close or prompt while a save is in progress', async () => {
    const onClose = vi.fn()
    render(<PromptHarness isDirty={true} isBusy={true} onClose={onClose} />)

    await userEvent.click(screen.getByRole('button', { name: 'Close editor' }))

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('warns before the browser unloads a dirty form', () => {
    render(<PromptHarness isDirty={true} isBusy={false} onClose={vi.fn()} />)
    const event = new Event('beforeunload', { cancelable: true })
    const preventDefault = vi.spyOn(event, 'preventDefault')

    fireEvent(window, event)

    expect(preventDefault).toHaveBeenCalledOnce()
  })

  it('blocks SPA navigation until dirty changes are kept or discarded', async () => {
    const user = userEvent.setup()
    const router = createMemoryRouter([{ path: '*', element: <NavigationGuardHarness /> }])
    render(<RouterProvider router={router} />)

    await user.click(screen.getByRole('link', { name: 'Navigate away' }))
    expect(screen.getByText('common.unsavedChanges.message')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'common.unsavedChanges.keepEditing' }))
    expect(screen.queryByText('Next page')).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Navigate away' }))
    await user.click(screen.getByRole('button', { name: 'common.unsavedChanges.discard' }))
    expect(await screen.findByText('Next page')).toBeInTheDocument()
  })
})
