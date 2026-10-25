import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ConfigNumberingPage from './ConfigNumberingPage'

const api = vi.hoisted(() => ({ getNumberingSequences: vi.fn(), upsertNumberingSequence: vi.fn() }))
const translate = (key: string, values?: { value?: string, type?: string, defaultValue?: string }) => values?.value ? `${key}: ${values.value}` : values?.type ? `${key}: ${values.type}` : values?.defaultValue ?? key
vi.mock('../../../lib/api', () => ({ ApiError: class extends Error {}, ...api }))
vi.mock('../../../app/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true, user: { permissions: ['billing.view', 'billing.manage'] } }) }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: translate }) }))

describe('ConfigNumberingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getNumberingSequences.mockResolvedValue([])
    api.upsertNumberingSequence.mockImplementation(async (request) => ({ id: 'sequence-1', currentPeriodKey: null, ...request }))
  })

  it('explains future impact and previews every supported generated number', async () => {
    render(<ConfigNumberingPage />)
    expect(await screen.findByText('config.numbering.impact')).toBeInTheDocument()
    expect(await screen.findAllByText(/config.numbering.preview:/)).toHaveLength(3)
    expect(screen.getByText(/SI-\d{6}-0001/)).toBeInTheDocument()
    expect(screen.getByText(/PI-\d{6}-0001/)).toBeInTheDocument()
    expect(screen.getByText(/JRN-\d{8}-0001/)).toBeInTheDocument()
  })

  it('saves the edited sequence without changing the other document types', async () => {
    render(<ConfigNumberingPage />)
    const nextNumbers = await screen.findAllByLabelText('config.numbering.fields.nextNumber')
    fireEvent.change(nextNumbers[0], { target: { value: '42' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'common.save' })[0])
    await waitFor(() => expect(api.upsertNumberingSequence).toHaveBeenCalledWith(expect.objectContaining({ documentType: 'SALES_INVOICE', nextNumber: 42 })))
  })
})
