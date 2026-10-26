/// <reference types="vitest/globals" />

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import DocumentsPanel from './DocumentsPanel'
import type { DocumentFolderListItemResponse, ProjectDocumentListItemResponse, ProjectDocumentVersionListItemResponse } from '../../../types/api'

const apiMocks = vi.hoisted(() => ({
  mockGetProjectDocumentFolders: vi.fn<() => Promise<DocumentFolderListItemResponse[]>>(),
  mockGetProjectDocuments: vi.fn<() => Promise<ProjectDocumentListItemResponse[]>>(),
  mockGetProjectDocumentVersions: vi.fn<() => Promise<ProjectDocumentVersionListItemResponse[]>>(),
  mockUploadProjectDocument: vi.fn(),
  mockAddProjectDocumentVersion: vi.fn(),
  mockChangeProjectDocumentStatus: vi.fn(),
  mockCreateProjectDocumentFolder: vi.fn(),
  mockDeleteProjectDocument: vi.fn(),
  mockDeleteProjectDocumentFolder: vi.fn(),
  mockGetProjectDocumentDownload: vi.fn(),
  mockUpdateProjectDocument: vi.fn(),
  mockUpdateProjectDocumentFolder: vi.fn(),
}))

const authMocks = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('../../../app/AuthContext', () => ({
  useAuth: () => authMocks.mockUseAuth(),
}))

vi.mock('../../../lib/api', () => ({
  ApiError: class ApiError extends Error {},
  addProjectDocumentVersion: apiMocks.mockAddProjectDocumentVersion,
  changeProjectDocumentStatus: apiMocks.mockChangeProjectDocumentStatus,
  createProjectDocumentFolder: apiMocks.mockCreateProjectDocumentFolder,
  deleteProjectDocument: apiMocks.mockDeleteProjectDocument,
  deleteProjectDocumentFolder: apiMocks.mockDeleteProjectDocumentFolder,
  getProjectDocumentDownload: apiMocks.mockGetProjectDocumentDownload,
  getProjectDocumentFolders: apiMocks.mockGetProjectDocumentFolders,
  getProjectDocumentVersions: apiMocks.mockGetProjectDocumentVersions,
  getProjectDocuments: apiMocks.mockGetProjectDocuments,
  updateProjectDocument: apiMocks.mockUpdateProjectDocument,
  updateProjectDocumentFolder: apiMocks.mockUpdateProjectDocumentFolder,
  uploadProjectDocument: apiMocks.mockUploadProjectDocument,
}))

vi.mock('@vexorion/ui', () => {
  const passThrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>

  return {
    AddRoundedIcon: () => <span aria-hidden="true" />,
    CloudUploadRoundedIcon: () => <span aria-hidden="true" />,
    DeleteOutlineRoundedIcon: () => <span aria-hidden="true" />,
    EditRoundedIcon: () => <span aria-hidden="true" />,
    FolderRoundedIcon: () => <span aria-hidden="true" />,
    SearchRoundedIcon: () => <span aria-hidden="true" />,
    VxAlert: ({ children }: { children?: ReactNode }) => <div role="alert">{children}</div>,
    VxBox: passThrough,
    VxButton: ({ children, onClick, disabled, 'aria-pressed': pressed }: ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button type="button" onClick={onClick} disabled={disabled} aria-pressed={pressed}>{children}</button>
    ),
    VxChip: ({ label }: { label: string }) => <span>{label}</span>,
    VxCircularProgress: () => <div>loading</div>,
    VxConfirmActionButton: ({ children, buttonProps }: { children?: ReactNode, buttonProps?: ButtonHTMLAttributes<HTMLButtonElement> }) => <button type="button" aria-label={buttonProps?.['aria-label']} disabled={buttonProps?.disabled}>{children}</button>,
    VxDialog: ({ open, children }: { open: boolean, children?: ReactNode }) => (open ? <div>{children}</div> : null),
    VxDialogActions: passThrough,
    VxDialogContent: passThrough,
    VxDialogTitle: passThrough,
    VxIconButton: ({ children, onClick, 'aria-label': label }: ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" aria-label={label} onClick={onClick}>{children}</button>,
    VxInputAdornment: passThrough,
    VxMenuItem: ({ children, value }: { children?: ReactNode, value: string | number }) => <option value={value}>{children}</option>,
    VxPaper: passThrough,
    VxStack: passThrough,
    VxTable: passThrough,
    VxTableBody: passThrough,
    VxTableCell: passThrough,
    VxTableContainer: passThrough,
    VxTableHead: passThrough,
    VxTableRow: passThrough,
    VxTextField: ({
      label,
      value,
      onChange,
      select,
      children,
      type,
      placeholder,
    }: {
      label?: string
      value?: string | number
      onChange?: (event: { target: { value: string } }) => void
      select?: boolean
      children?: ReactNode
      type?: string
      placeholder?: string
    }) => (
      select ? (
        <label>
          {label}
          <select
            aria-label={label}
            value={String(value ?? '')}
            onChange={(event) => onChange?.({ target: { value: event.target.value } })}
          >
            {children}
          </select>
        </label>
      ) : (
        <label>
          {label}
          <input
            aria-label={label}
            type={type ?? 'text'}
            value={String(value ?? '')}
            placeholder={placeholder}
            onChange={(event) => onChange?.({ target: { value: event.target.value } })}
          />
        </label>
      )
    ),
    VxTypography: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    VxTooltip: passThrough,
  }
})

describe('DocumentsPanel upload/version flows', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    apiMocks.mockGetProjectDocumentFolders.mockResolvedValue([])
    apiMocks.mockGetProjectDocuments.mockResolvedValue([
      {
        id: 'doc-1',
        projectId: 'project-1',
        documentFolderId: null,
        documentNumber: 'DOC-001',
        title: 'Specification',
        fileName: 'spec.pdf',
        contentType: 'application/pdf',
        fileSizeBytes: 120,
        currentVersionNumber: 1,
        status: 1,
        tags: null,
        isActive: true,
      },
    ])
    apiMocks.mockGetProjectDocumentVersions.mockResolvedValue([])
    apiMocks.mockUploadProjectDocument.mockResolvedValue({})
    apiMocks.mockAddProjectDocumentVersion.mockResolvedValue({})
  })

  it('shows no-access alert without document view permission', () => {
    authMocks.mockUseAuth.mockReturnValue({
      user: { permissions: [] },
    })

    render(<DocumentsPanel projectId="project-1" />)

    expect(screen.getByRole('alert')).toHaveTextContent('pages.projectDetails.documentsPanel.noAccess')
  })

  it('labels compact folder actions and preserves folder selection and reset', async () => {
    authMocks.mockUseAuth.mockReturnValue({
      user: { permissions: ['project-documents.view', 'project-documents.manage'] },
    })
    apiMocks.mockGetProjectDocumentFolders.mockResolvedValue([
      { id: 'folder-1', projectId: 'project-1', parentFolderId: null, name: 'Contracts and agreements', description: null, isActive: true },
    ])
    render(<DocumentsPanel projectId="project-1" />)

    const folder = await screen.findByRole('button', { name: 'Contracts and agreements' })
    expect(screen.getByRole('button', { name: 'pages.projectDetails.documentsPanel.newFolder' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'common.edit: Contracts and agreements' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'common.delete: Contracts and agreements' })).toBeInTheDocument()
    const allFolders = screen.getByRole('button', { name: 'pages.projectDetails.documentsPanel.allFolders' })
    expect(allFolders).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(folder)
    expect(folder).toHaveAttribute('aria-pressed', 'true')
    expect(allFolders).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(allFolders)
    expect(allFolders).toHaveAttribute('aria-pressed', 'true')
    expect(folder).toHaveAttribute('aria-pressed', 'false')
  })

  it('uploads a document when title and file are provided', async () => {
    authMocks.mockUseAuth.mockReturnValue({
      user: { permissions: ['project-documents.view', 'project-documents.upload'] },
    })

    const user = userEvent.setup()
    const { container } = render(<DocumentsPanel projectId="project-1" />)

    await waitFor(() => {
      expect(apiMocks.mockGetProjectDocuments).toHaveBeenCalledWith('project-1')
    })

    await user.click(screen.getByRole('button', { name: 'pages.projectDetails.documentsPanel.upload' }))

    await user.type(screen.getByLabelText('pages.projectDetails.documentsPanel.columns.title'), '  Upload Title  ')

    const file = new File(['hello'], 'upload.pdf', { type: 'application/pdf' })
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [file] } })

    const uploadButtons = screen.getAllByRole('button', { name: 'pages.projectDetails.documentsPanel.upload' })
    await user.click(uploadButtons[uploadButtons.length - 1])

    await waitFor(() => {
      expect(apiMocks.mockUploadProjectDocument).toHaveBeenCalledWith(
        'project-1',
        expect.objectContaining({
          title: 'Upload Title',
          documentFolderId: undefined,
          file,
        }),
      )
    })
  })

  it('confirms discarding unsaved upload details and restores the form baseline', async () => {
    authMocks.mockUseAuth.mockReturnValue({
      user: { permissions: ['project-documents.view', 'project-documents.upload'] },
    })

    const user = userEvent.setup()
    const { container } = render(<DocumentsPanel projectId="project-1" />)
    await waitFor(() => {
      expect(apiMocks.mockGetProjectDocuments).toHaveBeenCalledWith('project-1')
    })

    await user.click(screen.getByRole('button', { name: 'pages.projectDetails.documentsPanel.upload' }))
    const titleInput = screen.getByLabelText('pages.projectDetails.documentsPanel.columns.title')
    await user.type(titleInput, 'Unsaved title')
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, {
      target: { files: [new File(['draft'], 'draft.pdf', { type: 'application/pdf' })] },
    })

    await user.click(screen.getByRole('button', { name: 'common.cancel' }))
    expect(screen.getByText('common.unsavedChanges.message')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'common.unsavedChanges.keepEditing' }))
    expect(titleInput).toHaveValue('Unsaved title')

    await user.click(screen.getByRole('button', { name: 'common.cancel' }))
    await user.click(screen.getByRole('button', { name: 'common.unsavedChanges.discard' }))
    await user.click(screen.getAllByRole('button', { name: 'pages.projectDetails.documentsPanel.upload' })[0])

    expect(screen.getByLabelText('pages.projectDetails.documentsPanel.columns.title')).toHaveValue('')
    expect(container.querySelector('input[type="file"]')).toHaveProperty('files.length', 0)
  })

  it('adds a new version when a file is selected', async () => {
    authMocks.mockUseAuth.mockReturnValue({
      user: { permissions: ['project-documents.view', 'project-documents.upload'] },
    })

    const user = userEvent.setup()
    const { container } = render(<DocumentsPanel projectId="project-1" />)

    await waitFor(() => {
      expect(apiMocks.mockGetProjectDocumentVersions).toHaveBeenCalledWith('project-1', 'doc-1')
    })

    await user.click(screen.getByRole('button', { name: 'pages.projectDetails.documentsPanel.addVersion' }))

    const file = new File(['v2'], 'v2.pdf', { type: 'application/pdf' })
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [file] } })

    const addButtons = screen.getAllByRole('button', { name: 'pages.projectDetails.documentsPanel.addVersion' })
    await user.click(addButtons[addButtons.length - 1])

    await waitFor(() => {
      expect(apiMocks.mockAddProjectDocumentVersion).toHaveBeenCalledWith(
        'project-1',
        'doc-1',
        expect.objectContaining({
          file,
        }),
      )
    })
  })
})
