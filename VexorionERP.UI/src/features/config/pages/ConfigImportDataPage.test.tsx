/// <reference types="vitest/globals" />

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfigImportDataPage from './ConfigImportDataPage'
import type {
  AvailableImportTypeResponse,
  ImportJobStatusResponse,
  ImportValidationResultResponse,
} from '../../../types/api'

const apiMocks = vi.hoisted(() => ({
  mockGetAvailableImportTypes: vi.fn<() => Promise<AvailableImportTypeResponse[]>>(),
  mockDownloadImportTemplate: vi.fn<() => Promise<void>>(),
  mockValidateImportFile: vi.fn<(importType: string, file: File) => Promise<ImportValidationResultResponse>>(),
  mockSubmitImportJob: vi.fn<(importJobId: string) => Promise<ImportJobStatusResponse>>(),
}))
const authState = vi.hoisted(() => ({
  permissions: ['imports.validate', 'imports.submit', 'imports.history.view'],
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { requiredPermission?: string }) => (
      key === 'authorization.readOnly' ? `Read only: ${options?.requiredPermission}` : key
    ),
  }),
}))

vi.mock('../../../app/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: authState.permissions } }),
}))

vi.mock('../../../lib/api', () => ({
  getAvailableImportTypes: apiMocks.mockGetAvailableImportTypes,
  downloadImportTemplate: apiMocks.mockDownloadImportTemplate,
  validateImportFile: apiMocks.mockValidateImportFile,
  submitImportJob: apiMocks.mockSubmitImportJob,
}))

vi.mock('../components/ImportHistoryPanel', () => ({
  default: () => <div data-testid="import-history-panel" />,
}))

describe('ConfigImportDataPage import flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.permissions = ['imports.validate', 'imports.submit', 'imports.history.view']
    // Keep default tabs to avoid remount race while selecting a file in tests.
    apiMocks.mockGetAvailableImportTypes.mockResolvedValue([])
    apiMocks.mockDownloadImportTemplate.mockResolvedValue()
  })

  it('shows history without starting validation-only requests for a history viewer', async () => {
    authState.permissions = ['imports.history.view']
    render(<ConfigImportDataPage />)

    expect(await screen.findByTestId('import-history-panel')).toBeInTheDocument()
    expect(apiMocks.mockGetAvailableImportTypes).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'pages.importData.validate' })).not.toBeInTheDocument()
    expect(screen.getByText(/imports\.validate/)).toBeInTheDocument()
  })

  it('supports happy path: validate then submit successfully', async () => {
    const validationResult: ImportValidationResultResponse = {
      importJobId: '11111111-1111-1111-1111-111111111111',
      importType: 'customer',
      status: 2,
      totalRows: 2,
      validRows: 2,
      invalidRows: 0,
      errors: [],
    }

    const submitResult: ImportJobStatusResponse = {
      importJobId: validationResult.importJobId,
      importType: 'customer',
      status: 4,
      totalRows: 2,
      validRows: 2,
      invalidRows: 0,
      validatedAtUtc: null,
      submittedAtUtc: null,
      completedAtUtc: null,
      errorSummary: null,
    }

    apiMocks.mockValidateImportFile.mockResolvedValue(validationResult)
    apiMocks.mockSubmitImportJob.mockResolvedValue(submitResult)

    const user = userEvent.setup()
    const { container } = render(<ConfigImportDataPage />)

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement | null
    expect(fileInput).not.toBeNull()

    const file = new File(['content'], 'customers.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    fireEvent.change(fileInput as HTMLInputElement, { target: { files: [file] } })
    await user.click(screen.getByRole('button', { name: 'pages.importData.validate' }))

    await waitFor(() => {
      expect(apiMocks.mockValidateImportFile).toHaveBeenCalled()
    })

    const [calledImportType] = apiMocks.mockValidateImportFile.mock.calls[0]
    expect(String(calledImportType).toLowerCase()).toBe('customer')

    expect(screen.getByText('pages.importData.allRowsValid')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'pages.importData.submit' }))

    await waitFor(() => {
      expect(apiMocks.mockSubmitImportJob).toHaveBeenCalledWith(validationResult.importJobId)
    })

    expect(screen.getByText('pages.importData.submitSuccess')).toBeInTheDocument()
  })

  it('shows validation errors and keeps submit disabled when file is invalid', async () => {
    const validationResult: ImportValidationResultResponse = {
      importJobId: '22222222-2222-2222-2222-222222222222',
      importType: 'customer',
      status: 3,
      totalRows: 1,
      validRows: 0,
      invalidRows: 1,
      errors: [
        {
          rowNumber: 2,
          columnName: 'Email',
          category: 'Validation',
          message: 'Invalid email format',
        },
      ],
    }

    apiMocks.mockValidateImportFile.mockResolvedValue(validationResult)

    const user = userEvent.setup()
    const { container } = render(<ConfigImportDataPage />)

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement | null
    expect(fileInput).not.toBeNull()

    const file = new File(['content'], 'customers-invalid.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    fireEvent.change(fileInput as HTMLInputElement, { target: { files: [file] } })
    await user.click(screen.getByRole('button', { name: 'pages.importData.validate' }))

    await waitFor(() => {
      expect(apiMocks.mockValidateImportFile).toHaveBeenCalledOnce()
    })

    expect(screen.getByText('Invalid email format')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'pages.importData.submit' })).not.toBeInTheDocument()
    expect(apiMocks.mockSubmitImportJob).not.toHaveBeenCalled()
  })
})
