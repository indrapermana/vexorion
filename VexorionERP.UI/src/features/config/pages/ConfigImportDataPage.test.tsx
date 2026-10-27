/// <reference types="vitest/globals" />

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfigImportDataPage from './ConfigImportDataPage'
import type {
  AvailableImportTypeResponse,
  ImportJobStatusResponse,
  ImportValidationResultResponse,
  ValidateImportRowsRequest,
} from '../../../types/api'

const apiMocks = vi.hoisted(() => ({
  mockGetAvailableImportTypes: vi.fn<() => Promise<AvailableImportTypeResponse[]>>(),
  mockDownloadImportTemplate: vi.fn<() => Promise<void>>(),
  mockValidateImportFile: vi.fn<(importType: string, file: File) => Promise<ImportValidationResultResponse>>(),
  mockValidateImportRows: vi.fn<(request: ValidateImportRowsRequest) => Promise<ImportValidationResultResponse>>(),
  mockSubmitImportJob: vi.fn<(importJobId: string) => Promise<ImportJobStatusResponse>>(),
  mockGetImportJobStatus: vi.fn(),
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
  validateImportRows: apiMocks.mockValidateImportRows,
  submitImportJob: apiMocks.mockSubmitImportJob,
  getImportJobStatus: apiMocks.mockGetImportJobStatus,
}))

vi.mock('../components/ImportHistoryPanel', () => ({
  default: () => <div data-testid="import-history-panel" />,
}))

describe('ConfigImportDataPage import flow', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
    authState.permissions = ['imports.validate', 'imports.submit', 'imports.history.view']
    // Keep default tabs to avoid remount race while selecting a file in tests.
    apiMocks.mockGetAvailableImportTypes.mockResolvedValue([])
    apiMocks.mockDownloadImportTemplate.mockResolvedValue()
  })

  const validation = (): ImportValidationResultResponse => ({ importJobId: 'job-1', importType: 'customer', sourceFileName: 'customers.xlsx', status: 2, totalRows: 2, validRows: 2, invalidRows: 0, errors: [], previewHeaders: ['CustomerNumber', 'Name'], previewRows: [{ rowNumber: 2, values: { CustomerNumber: 'C-1', Name: 'Example' } }, { rowNumber: 3, values: { CustomerNumber: 'C-2', Name: 'Second' } }] })
  const completed = (): ImportJobStatusResponse => ({ ...validation(), status: 4, submittedAtUtc: '2026-10-26T10:00:00Z', completedAtUtc: '2026-10-26T10:00:01Z' })
  const selectFile = () => {
    if (!screen.queryByLabelText('pages.importData.chooseFile')) fireEvent.click(screen.getByRole('button', { name: 'pages.importData.next' }))
    fireEvent.change(screen.getByLabelText('pages.importData.chooseFile'), { target: { files: [new File(['data'], 'customers.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })] } })
  }
  const validate = async () => { selectFile(); fireEvent.click(screen.getByRole('button', { name: 'pages.importData.next' })); await screen.findByRole('grid', { name: 'pages.importData.previewGrid' }) }
  const continueToSubmit = () => fireEvent.click(screen.getByRole('button', { name: 'pages.importData.next' }))

  it('shows one stage at a time, previews rows, and submits directly from the summary', async () => {
    apiMocks.mockValidateImportFile.mockResolvedValue(validation())
    apiMocks.mockSubmitImportJob.mockResolvedValue(completed())
    render(<ConfigImportDataPage />)
    expect(screen.getByRole('button', { name: 'pages.importData.downloadTemplate' })).toBeVisible()
    expect(screen.queryByLabelText('pages.importData.chooseFile')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'pages.importData.next' }))
    expect(screen.queryByRole('button', { name: 'pages.importData.downloadTemplate' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('pages.importData.chooseFile')).toBeInTheDocument()
    await validate()
    expect(screen.getByText('Example')).toBeVisible()
    expect(screen.queryByLabelText('pages.importData.chooseFile')).not.toBeInTheDocument()
    continueToSubmit()
    expect(screen.getByText('pages.importData.validRows: 2')).toBeVisible()
    const submit = screen.getByRole('button', { name: 'pages.importData.submit' })
    fireEvent.click(submit); fireEvent.click(submit)
    expect(apiMocks.mockSubmitImportJob).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('pages.importData.submitSuccess')).toBeInTheDocument()
  })

  it('retains a lost submission outcome and restores the same completed job on remount', async () => {
    apiMocks.mockValidateImportFile.mockResolvedValue(validation())
    apiMocks.mockSubmitImportJob.mockRejectedValue(new Error('Response lost'))
    apiMocks.mockGetImportJobStatus.mockResolvedValue(completed())
    const first = render(<ConfigImportDataPage />)
    await validate()
    continueToSubmit()
    fireEvent.click(screen.getByRole('button', { name: 'pages.importData.submit' }))
    expect(await screen.findByText('pages.importData.submitUnconfirmed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'pages.importData.previous' })).toBeDisabled()
    expect(sessionStorage.getItem('vexorion.import-job:unknown:customer')).toBe('job-1')
    first.unmount()
    render(<ConfigImportDataPage />)
    expect(await screen.findByText('pages.importData.submitSuccess')).toBeInTheDocument()
    expect(apiMocks.mockGetImportJobStatus).toHaveBeenCalledWith('job-1')
    expect(apiMocks.mockSubmitImportJob).toHaveBeenCalledTimes(1)
    expect(apiMocks.mockValidateImportFile).toHaveBeenCalledTimes(1)
  })

  it('does not start another import while an accepted job is awaiting its result', async () => {
    sessionStorage.setItem('vexorion.import-job:unknown:customer', 'job-1')
    apiMocks.mockGetImportJobStatus.mockResolvedValue({ ...completed(), status: 2, completedAtUtc: null })
    render(<ConfigImportDataPage />)
    await screen.findByText('pages.importData.submitSuccess')
    expect(screen.getByRole('button', { name: 'pages.importData.importAnother' })).toBeDisabled()
    expect(screen.queryByLabelText('pages.importData.chooseFile')).not.toBeInTheDocument()
    expect(apiMocks.mockSubmitImportJob).not.toHaveBeenCalled()
  })

  it('keeps a stored job blocked when status refresh fails', async () => {
    sessionStorage.setItem('vexorion.import-job:unknown:customer', 'job-1')
    apiMocks.mockGetImportJobStatus.mockRejectedValue(new Error('Offline'))
    render(<ConfigImportDataPage />)
    expect(await screen.findByText('pages.importData.recoveryUnavailable')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'pages.importData.previous' })).toBeDisabled()
    expect(apiMocks.mockSubmitImportJob).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('vexorion.import-job:unknown:customer')).toBe('job-1')
  })

  it('restores a validated unsubmitted job for explicit review rather than submitting it automatically', async () => {
    sessionStorage.setItem('vexorion.import-job:unknown:customer', 'job-1')
    apiMocks.mockGetImportJobStatus.mockResolvedValue({ ...completed(), status: 2, submittedAtUtc: null, completedAtUtc: null })
    render(<ConfigImportDataPage />)
    expect(await screen.findByRole('grid', { name: 'pages.importData.previewGrid' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'pages.importData.next' })).toBeEnabled()
    expect(apiMocks.mockSubmitImportJob).not.toHaveBeenCalled()
  })

  it('retains a selected file across import-type tab switches', async () => {
    render(<ConfigImportDataPage />)
    selectFile()
    fireEvent.click(screen.getByRole('tab', { name: 'pages.importData.entityTypes.Supplier' }))
    expect(screen.getByRole('button', { name: 'pages.importData.downloadTemplate' })).toBeVisible()
    fireEvent.click(screen.getByRole('tab', { name: 'pages.importData.entityTypes.Customer' }))
    expect(screen.getByText('customers.xlsx')).toBeVisible()
    expect(screen.getByRole('button', { name: 'pages.importData.next' })).toBeEnabled()
  })

  it('requires revalidation after choosing a corrected file', async () => {
    apiMocks.mockValidateImportFile.mockResolvedValue(validation())
    render(<ConfigImportDataPage />)
    await validate()
    fireEvent.click(screen.getByRole('button', { name: 'pages.importData.previous' }))
    selectFile()
    expect(screen.queryByRole('grid', { name: 'pages.importData.previewGrid' })).not.toBeInTheDocument()
    expect(sessionStorage.getItem('vexorion.import-job:unknown:customer')).toBeNull()
  })

  it('does not submit an empty validation result', async () => {
    apiMocks.mockValidateImportFile.mockResolvedValue({ ...validation(), validRows: 0, totalRows: 0, previewRows: [] })
    render(<ConfigImportDataPage />)
    await validate()
    await screen.findByText('pages.importData.correctionRequired')
    expect(screen.getByRole('button', { name: 'pages.importData.next' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'pages.importData.submit' })).not.toBeInTheDocument()
  })

  it('keeps review disabled for validation-only users', async () => {
    authState.permissions = ['imports.validate']
    apiMocks.mockValidateImportFile.mockResolvedValue(validation())
    render(<ConfigImportDataPage />)
    await validate()
    continueToSubmit()
    expect(screen.queryByRole('button', { name: 'pages.importData.submit' })).not.toBeInTheDocument()
    expect(apiMocks.mockSubmitImportJob).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('vexorion.import-job:unknown:customer')).toBeNull()
  })

  it('edits preview cells and revalidates the changed rows before opening Submit', async () => {
    const invalid = { ...validation(), status: 3, validRows: 1, invalidRows: 1, errors: [{ rowNumber: 2, columnName: 'Name', category: 'BusinessRule', message: 'Name is required.' }], previewRows: [{ rowNumber: 2, values: { CustomerNumber: 'C-1', Name: '' } }] }
    const corrected = { ...validation(), totalRows: 1, validRows: 1, previewRows: [{ rowNumber: 2, values: { CustomerNumber: 'C-1', Name: 'Fixed name' } }] }
    apiMocks.mockValidateImportFile.mockResolvedValue(invalid)
    let finishRevalidation!: (result: ImportValidationResultResponse) => void
    apiMocks.mockValidateImportRows.mockImplementation(() => new Promise((resolve) => { finishRevalidation = resolve }))
    render(<ConfigImportDataPage />)
    await validate()
    expect(screen.getByText('Name is required.')).toBeVisible()
    const cell = screen.getByRole('grid', { name: 'pages.importData.previewGrid' }).querySelector('[data-id="2"] [data-field="Name"]')
    expect(cell).not.toBeNull()
    fireEvent.doubleClick(cell as HTMLElement)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Fixed name' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(await screen.findByText('pages.importData.revalidateChanges')).toBeVisible()
    continueToSubmit()
    await waitFor(() => expect(apiMocks.mockValidateImportRows).toHaveBeenCalledOnce())
    expect(screen.getByRole('grid', { name: 'pages.importData.previewGrid' })).toBeVisible()
    await act(async () => finishRevalidation(corrected))
    expect(apiMocks.mockValidateImportRows.mock.calls[0][0].rows[0].values.Name).toBe('Fixed name')
    expect(await screen.findByRole('button', { name: 'pages.importData.submit' })).toBeEnabled()
  })

  it('shows history without starting validation-only requests for a history viewer', async () => {
    authState.permissions = ['imports.history.view']
    render(<ConfigImportDataPage />)

    expect(await screen.findByTestId('import-history-panel')).toBeInTheDocument()
    expect(apiMocks.mockGetAvailableImportTypes).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('pages.importData.chooseFile')).not.toBeInTheDocument()
    expect(screen.getByText(/imports\.validate/)).toBeInTheDocument()
  })

  it('supports happy path: validate then submit successfully', async () => {
    const validationResult: ImportValidationResultResponse = {
      importJobId: '11111111-1111-1111-1111-111111111111',
      importType: 'customer',
      sourceFileName: 'customers.xlsx',
      status: 2,
      totalRows: 2,
      validRows: 2,
      invalidRows: 0,
      errors: [],
      previewHeaders: ['CustomerNumber', 'Name'],
      previewRows: [{ rowNumber: 2, values: { CustomerNumber: 'C-1', Name: 'Example' } }, { rowNumber: 3, values: { CustomerNumber: 'C-2', Name: 'Second' } }],
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
      sourceFileName: 'customers.xlsx',
    }

    apiMocks.mockValidateImportFile.mockResolvedValue(validationResult)
    apiMocks.mockSubmitImportJob.mockResolvedValue(submitResult)

    const user = userEvent.setup()
    const { container } = render(<ConfigImportDataPage />)

    fireEvent.click(screen.getByRole('button', { name: 'pages.importData.next' }))

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement | null
    expect(fileInput).not.toBeNull()

    const file = new File(['content'], 'customers.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    fireEvent.change(fileInput as HTMLInputElement, { target: { files: [file] } })
    await user.click(screen.getByRole('button', { name: 'pages.importData.next' }))

    await waitFor(() => {
      expect(apiMocks.mockValidateImportFile).toHaveBeenCalled()
    })

    const [calledImportType] = apiMocks.mockValidateImportFile.mock.calls[0]
    expect(String(calledImportType).toLowerCase()).toBe('customer')

    expect(await screen.findByRole('grid', { name: 'pages.importData.previewGrid' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'pages.importData.next' }))
    expect(apiMocks.mockSubmitImportJob).not.toHaveBeenCalled()
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
      sourceFileName: 'customers-invalid.xlsx',
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
      previewHeaders: ['CustomerNumber', 'Name', 'Email'],
      previewRows: [{ rowNumber: 2, values: { CustomerNumber: 'C-1', Name: '', Email: 'bad' } }],
    }

    apiMocks.mockValidateImportFile.mockResolvedValue(validationResult)

    render(<ConfigImportDataPage />)
    await validate()

    await waitFor(() => {
      expect(apiMocks.mockValidateImportFile).toHaveBeenCalledOnce()
    })

    expect(screen.getByText('Invalid email format')).toBeVisible()
    expect(screen.getByRole('button', { name: 'pages.importData.next' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'pages.importData.submit' })).not.toBeInTheDocument()
    expect(apiMocks.mockSubmitImportJob).not.toHaveBeenCalled()
  })
})
