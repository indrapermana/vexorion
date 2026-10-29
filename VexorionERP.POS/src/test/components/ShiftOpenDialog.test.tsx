import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, fireEvent, userEvent } from '../testUtils'
import { ShiftOpenDialog } from '../../components/pos/ShiftOpenDialog'

describe('ShiftOpenDialog', () => {
  it('renders when open=true', () => {
    renderWithProviders(
      <ShiftOpenDialog open cashierName="Alice" currencyCode="USD" onOpen={vi.fn()} />,
    )
    // Dialog title should contain some shift-related text
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('does not render dialog content when open=false', () => {
    renderWithProviders(
      <ShiftOpenDialog open={false} cashierName="Alice" currencyCode="USD" onOpen={vi.fn()} />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows error when submitting with empty input', async () => {
    const onOpen = vi.fn()
    renderWithProviders(
      <ShiftOpenDialog open cashierName="Bob" currencyCode="USD" onOpen={onOpen} />,
    )
    const submitBtn = screen.getByRole('button', { name: /open shift|open|mulai|abrir/i })
    await userEvent.setup().click(submitBtn)
    expect(onOpen).not.toHaveBeenCalled()
    expect(screen.getByText(/valid opening amount/i)).toBeInTheDocument()
  })

  it('shows error when a negative float is entered', async () => {
    const onOpen = vi.fn()
    renderWithProviders(
      <ShiftOpenDialog open cashierName="Bob" currencyCode="USD" onOpen={onOpen} />,
    )
    const input = screen.getByRole('spinbutton')
    await userEvent.setup().type(input, '-50')
    fireEvent.click(screen.getByRole('button', { name: /open shift|open|mulai|abrir/i }))
    expect(onOpen).not.toHaveBeenCalled()
    expect(screen.getByText(/valid opening amount/i)).toBeInTheDocument()
  })

  it('calls onOpen with the parsed float when a valid amount is entered', async () => {
    const onOpen = vi.fn()
    renderWithProviders(
      <ShiftOpenDialog open cashierName="Carol" currencyCode="USD" onOpen={onOpen} />,
    )
    const input = screen.getByRole('spinbutton')
    await userEvent.setup().type(input, '250')
    fireEvent.click(screen.getByRole('button', { name: /open shift|open|mulai|abrir/i }))
    expect(onOpen).toHaveBeenCalledWith(250)
  })

  it('calls onOpen with 0 when 0 is entered', async () => {
    const onOpen = vi.fn()
    renderWithProviders(
      <ShiftOpenDialog open cashierName="Dave" currencyCode="USD" onOpen={onOpen} />,
    )
    const input = screen.getByRole('spinbutton')
    await userEvent.setup().type(input, '0')
    fireEvent.click(screen.getByRole('button', { name: /open shift|open|mulai|abrir/i }))
    expect(onOpen).toHaveBeenCalledWith(0)
  })

  it('submits on Enter key press', async () => {
    const onOpen = vi.fn()
    renderWithProviders(
      <ShiftOpenDialog open cashierName="Eve" currencyCode="USD" onOpen={onOpen} />,
    )
    const input = screen.getByRole('spinbutton')
    await userEvent.setup().type(input, '100{Enter}')
    expect(onOpen).toHaveBeenCalledWith(100)
  })
})
