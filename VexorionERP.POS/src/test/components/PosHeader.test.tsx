import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen } from '../testUtils'
import { PosHeader } from '../../components/pos/PosHeader'

const BASE_PROPS = {
  canManageRoles: false,
  currencyCode: 'USD',
  isShiftOpen: false,
  canCloseShift: false,
  canRefund: false,
  onCloseShift: vi.fn(),
  onOpenReturn: vi.fn(),
}

describe('PosHeader', () => {
  it('renders title', () => {
    renderWithProviders(<PosHeader {...BASE_PROPS} />)
    expect(screen.getByText(/vexorion pos/i)).toBeInTheDocument()
  })

  it('shows currency chip', () => {
    renderWithProviders(<PosHeader {...BASE_PROPS} currencyCode="EUR" />)
    expect(screen.getByText(/EUR/)).toBeInTheDocument()
  })

  it('does NOT show Return button when canRefund=false', () => {
    renderWithProviders(<PosHeader {...BASE_PROPS} canRefund={false} />)
    expect(screen.queryByRole('button', { name: /return|retur|devolucion/i })).not.toBeInTheDocument()
  })

  it('shows Return button when canRefund=true', () => {
    renderWithProviders(<PosHeader {...BASE_PROPS} canRefund />)
    expect(screen.getByRole('button', { name: /return|retur|devolucion/i })).toBeInTheDocument()
  })

  it('calls onOpenReturn when Return button is clicked', () => {
    const onOpenReturn = vi.fn()
    renderWithProviders(<PosHeader {...BASE_PROPS} canRefund onOpenReturn={onOpenReturn} />)
    screen.getByRole('button', { name: /return|retur|devolucion/i }).click()
    expect(onOpenReturn).toHaveBeenCalledOnce()
  })

  it('does NOT show Close Shift button when isShiftOpen=false', () => {
    renderWithProviders(<PosHeader {...BASE_PROPS} isShiftOpen={false} canCloseShift />)
    expect(screen.queryByRole('button', { name: /close shift|tutup giliran|cerrar turno/i })).not.toBeInTheDocument()
  })

  it('shows Close Shift button when isShiftOpen=true and canCloseShift=true', () => {
    renderWithProviders(
      <PosHeader
        {...BASE_PROPS}
        isShiftOpen
        canCloseShift
        shiftOpenedAt={new Date().toISOString()}
      />,
    )
    expect(screen.getByRole('button', { name: /close shift|tutup giliran|cerrar turno/i })).toBeInTheDocument()
  })

  it('does NOT show Close Shift button when canCloseShift=false even if shift is open', () => {
    renderWithProviders(
      <PosHeader
        {...BASE_PROPS}
        isShiftOpen
        canCloseShift={false}
        shiftOpenedAt={new Date().toISOString()}
      />,
    )
    expect(screen.queryByRole('button', { name: /close shift|tutup giliran|cerrar turno/i })).not.toBeInTheDocument()
  })

  it('shows shift open chip when shift is open', () => {
    renderWithProviders(
      <PosHeader
        {...BASE_PROPS}
        isShiftOpen
        shiftOpenedAt={new Date().toISOString()}
      />,
    )
    // Chip should reflect open status (not the "no shift" fallback text)
    expect(screen.queryByText(/no active shift|tidak ada giliran|sin turno/i)).not.toBeInTheDocument()
  })

  it('shows no-shift chip when no shift is open', () => {
    renderWithProviders(<PosHeader {...BASE_PROPS} isShiftOpen={false} />)
    expect(screen.getByText(/no active shift|tidak ada giliran|sin turno/i)).toBeInTheDocument()
  })
})
