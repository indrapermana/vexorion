import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { VxPageEmpty, VxPageFeedback } from '@vexorion/ui'

describe('shared page states', () => {
  it('uses the caller-provided retry label and action', async () => {
    const onRetry = vi.fn()
    render(<VxPageFeedback error="Unable to load" onRetry={onRetry} retryLabel="Coba lagi" />)

    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }))

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('exposes an explicit empty state', () => {
    render(<VxPageEmpty title="No tenants available" description="Onboard a tenant first." />)

    expect(screen.getByRole('status')).toHaveTextContent('No tenants available')
    expect(screen.getByRole('heading', { name: 'No tenants available' })).toBeInTheDocument()
  })
})
