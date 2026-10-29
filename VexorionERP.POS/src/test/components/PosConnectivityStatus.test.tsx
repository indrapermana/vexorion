import { describe, expect, it } from 'vitest'
import { PosConnectivityStatus } from '../../components/PosConnectivityStatus'
import { renderWithProviders, screen } from '../testUtils'

describe('PosConnectivityStatus', () => {
  it('does not render while online', () => {
    renderWithProviders(<PosConnectivityStatus isOnline />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('states that offline work is not queued', () => {
    renderWithProviders(<PosConnectivityStatus isOnline={false} />)

    expect(screen.getByRole('status')).toHaveTextContent('POS is offline')
    expect(screen.getByRole('status')).toHaveTextContent('Nothing is queued for automatic submission')
  })
})
