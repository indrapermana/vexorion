/// <reference types="vitest/globals" />

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { MouseEventHandler, ReactNode } from 'react'
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
    VxAlert: ({ children }: { children?: ReactNode }) => <div role="alert">{children}</div>,
    VxBox: passThrough,
    VxButton: ({ children, onClick, disabled }: { children?: ReactNode, onClick?: MouseEventHandler<HTMLButtonElement>, disabled?: boolean }) => (
      <button type="button" onClick={onClick} disabled={disabled}>{children}</button>
    ),
    VxChip: ({ label }: { label: string }) => <span>{label}</span>,
    VxCircularProgress: () => <div>loading</div>,
    VxDialog: ({ open, children }: { open: boolean, children?: ReactNode }) => (open ? <div>{children}</div> : null),
    VxDialogActions: passThrough,
    VxDialogContent: passThrough,
    VxDialogTitle: passThrough,
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
