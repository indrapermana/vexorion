/// <reference types="vitest/globals" />

import { act, fireEvent, render as renderComponent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement, type ButtonHTMLAttributes, type ElementType, type HTMLAttributes, type ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import DocumentsPanel from './DocumentsPanel'
import type { DocumentFolderListItemResponse, ProjectDocumentListItemResponse, ProjectDocumentVersionListItemResponse } from '../../../types/api'

const apiMocks = vi.hoisted(() => ({
  t: (key: string) => key,
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
  mockGetProjectDocument: vi.fn(),
  mockUpdateProjectDocument: vi.fn(),
  mockUpdateProjectDocumentFolder: vi.fn(),
}))

const authMocks = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: apiMocks.t }),
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
  getProjectDocument: apiMocks.mockGetProjectDocument,
  getProjectDocumentFolders: apiMocks.mockGetProjectDocumentFolders,
  getProjectDocumentVersions: apiMocks.mockGetProjectDocumentVersions,
  getProjectDocuments: apiMocks.mockGetProjectDocuments,
  updateProjectDocument: apiMocks.mockUpdateProjectDocument,
  updateProjectDocumentFolder: apiMocks.mockUpdateProjectDocumentFolder,
  uploadProjectDocument: apiMocks.mockUploadProjectDocument,
}))

vi.mock('@vexorion/ui', () => {
  const passThrough = ({ children, component = 'div', role, 'aria-label': label }: HTMLAttributes<HTMLElement> & { component?: ElementType }) => createElement(component, { role, 'aria-label': label }, children)

  return {
    AddRoundedIcon: () => <span aria-hidden="true" />,
    CloudUploadRoundedIcon: () => <span aria-hidden="true" />,
    DeleteOutlineRoundedIcon: () => <span aria-hidden="true" />,
    DownloadRoundedIcon: () => <span aria-hidden="true" />,
    VisibilityRoundedIcon: () => <span aria-hidden="true" />,
    EditRoundedIcon: () => <span aria-hidden="true" />,
    FolderRoundedIcon: () => <span aria-hidden="true" />,
    SearchRoundedIcon: () => <span aria-hidden="true" />,
    VxAlert: ({ children, action }: { children?: ReactNode, action?: ReactNode }) => <div role="alert">{children}{action}</div>,
    VxBox: passThrough,
    VxButton: ({ children, onClick, disabled, 'aria-pressed': pressed, 'aria-current': current }: ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button type="button" onClick={onClick} disabled={disabled} aria-pressed={pressed} aria-current={current}>{children}</button>
    ),
    VxChip: ({ label }: { label: string }) => <span>{label}</span>,
    VxCircularProgress: () => <div>loading</div>,
    VxConfirmActionButton: ({ children, buttonProps }: { children?: ReactNode, buttonProps?: ButtonHTMLAttributes<HTMLButtonElement> }) => <button type="button" aria-label={buttonProps?.['aria-label']} disabled={buttonProps?.disabled}>{children}</button>,
    VxConfirmActionDialog: ({ open, targetName, onConfirm, onClose }: { open: boolean, targetName: string, onConfirm: () => void, onClose: () => void }) => open ? <div role="dialog">{targetName}<button onClick={onConfirm}>Confirm delete</button><button onClick={onClose}>Cancel delete</button></div> : null,
    VxDialog: ({ open, children }: { open: boolean, children?: ReactNode }) => (open ? <div role="dialog">{children}</div> : null),
    VxDialogActions: passThrough,
    VxDialogContent: passThrough,
    VxDialogTitle: passThrough,
    VxIconButton: ({ children, onClick, disabled, 'aria-label': label }: ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" aria-label={label} disabled={disabled} onClick={onClick}>{children}</button>,
    VxInputAdornment: passThrough,
    VxMenuItem: ({ children, value }: { children?: ReactNode, value: string | number }) => <option value={value}>{children}</option>,
    VxPaper: passThrough,
    VxStack: passThrough,
    VxTable: passThrough,
    VxTableBody: passThrough,
    VxTableCell: passThrough,
    VxTableContainer: passThrough,
    VxTableHead: passThrough,
    VxTableRow: ({ children, onClick }: HTMLAttributes<HTMLDivElement>) => <div onClick={onClick}>{children}</div>,
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

function render(ui: ReactNode, initialEntry = '/projects/project-1?tab=documents') {
  const router = createMemoryRouter([{ path: '*', element: ui }], { initialEntries: [initialEntry] })
  return { ...renderComponent(<RouterProvider router={router} />), router }
}

function documentFixture(id: string, title: string, folderId: string | null = null): ProjectDocumentListItemResponse {
  return { id, title, projectId: 'project-1', documentFolderId: folderId, documentNumber: `DOC-${id}`, fileName: `${id}.pdf`, contentType: 'application/pdf', fileSizeBytes: 100, currentVersionNumber: 1, status: 1, isActive: true }
}

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

  it('loads metadata for the selected second document and preserves its stored notes', async () => {
    authMocks.mockUseAuth.mockReturnValue({ user: { permissions: ['project-documents.view', 'project-documents.manage'] } })
    apiMocks.mockGetProjectDocuments.mockResolvedValue([documentFixture('first', 'First document'), documentFixture('second', 'Second document')])
    apiMocks.mockGetProjectDocument.mockResolvedValue({ ...documentFixture('second', 'Second document'), notes: 'Keep these notes', tags: 'contract' })
    apiMocks.mockUpdateProjectDocument.mockResolvedValue({})
    const user = userEvent.setup()
    render(<DocumentsPanel projectId="project-1" />)
    const second = await screen.findByRole('button', { name: 'Second document' })
    act(() => second.focus())
    await user.keyboard('{Enter}')
    expect(second).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'pages.projectDetails.documentsPanel.metadata' }))
    const dialog = await screen.findByRole('dialog')
    expect(apiMocks.mockGetProjectDocument).toHaveBeenCalledWith('project-1', 'second')
    expect(within(dialog).getByLabelText('pages.projectDetails.documentsPanel.columns.title')).toHaveValue('Second document')
    expect(within(dialog).getByLabelText('pages.projectDetails.documentsPanel.notes')).toHaveValue('Keep these notes')
    fireEvent.click(within(dialog).getByRole('button', { name: 'common.save' }))
    await waitFor(() => expect(apiMocks.mockUpdateProjectDocument).toHaveBeenCalledWith('project-1', 'second', expect.objectContaining({ title: 'Second document', notes: 'Keep these notes', tags: 'contract' })))
  })

  it('provides ancestor breadcrumbs that update folder context without deleting other URL state', async () => {
    authMocks.mockUseAuth.mockReturnValue({ user: { permissions: ['project-documents.view'] } })
    apiMocks.mockGetProjectDocumentFolders.mockResolvedValue([
      { id: 'parent', projectId: 'project-1', parentFolderId: null, name: 'Contracts', isActive: true },
      { id: 'child', projectId: 'project-1', parentFolderId: 'parent', name: 'Signed', isActive: true },
    ])
    const { router } = render(<DocumentsPanel projectId="project-1" />, '/projects/project-1?tab=documents&folder=child&documentSearch=contract')
    const breadcrumbs = await screen.findByRole('navigation', { name: 'pages.projectDetails.documentsPanel.breadcrumbs' })
    await waitFor(() => expect(within(breadcrumbs).getByRole('button', { name: 'Signed' })).toHaveAttribute('aria-current', 'location'))
    fireEvent.click(within(breadcrumbs).getByRole('button', { name: 'Contracts' }))
    const query = new URLSearchParams(router.state.location.search)
    expect(query.get('folder')).toBe('parent')
    expect(query.get('documentSearch')).toBe('contract')
    expect(query.get('tab')).toBe('documents')
  })

  it('bounds breadcrumb traversal for cyclic folder data', async () => {
    authMocks.mockUseAuth.mockReturnValue({ user: { permissions: ['project-documents.view'] } })
    apiMocks.mockGetProjectDocumentFolders.mockResolvedValue([
      { id: 'one', projectId: 'project-1', parentFolderId: 'two', name: 'One', isActive: true },
      { id: 'two', projectId: 'project-1', parentFolderId: 'one', name: 'Two', isActive: true },
    ])
    render(<DocumentsPanel projectId="project-1" />, '/projects/project-1?tab=documents&folder=one')
    const breadcrumbs = screen.getByRole('navigation', { name: 'pages.projectDetails.documentsPanel.breadcrumbs' })
    expect(await within(breadcrumbs).findByRole('button', { name: 'One' })).toBeInTheDocument()
    expect(within(breadcrumbs).getAllByRole('button')).toHaveLength(3)
  })

  it('hides selected-document actions when filters exclude an explicit selection', async () => {
    authMocks.mockUseAuth.mockReturnValue({ user: { permissions: ['project-documents.view', 'project-documents.manage', 'project-documents.download'] } })
    render(<DocumentsPanel projectId="project-1" />, '/projects/project-1?tab=documents&document=doc-1')
    await screen.findByRole('region', { name: 'pages.projectDetails.documentsPanel.selectedDocument' })
    fireEvent.change(screen.getByLabelText('pages.projectDetails.documentsPanel.search'), { target: { value: 'no match' } })
    expect(screen.queryByRole('region', { name: 'pages.projectDetails.documentsPanel.selectedDocument' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'pages.projectDetails.documentsPanel.metadata' })).not.toBeInTheDocument()
    expect(screen.getByText('pages.projectDetails.documentsPanel.selectionUnavailable')).toBeInTheDocument()
  })

  it('previews the clicked row rather than the currently selected document', async () => {
    authMocks.mockUseAuth.mockReturnValue({ user: { permissions: ['project-documents.view', 'project-documents.download'] } })
    apiMocks.mockGetProjectDocuments.mockResolvedValue([documentFixture('first', 'First document'), documentFixture('second', 'Second document')])
    apiMocks.mockGetProjectDocumentDownload.mockResolvedValue({ downloadUrl: 'https://files.example.invalid/second.pdf' })
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    render(<DocumentsPanel projectId="project-1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'pages.projectDetails.documentsPanel.preview: Second document' }))
    await waitFor(() => expect(apiMocks.mockGetProjectDocumentDownload).toHaveBeenCalledWith('project-1', 'second'))
    expect(open).toHaveBeenCalledWith('https://files.example.invalid/second.pdf', '_blank', 'noopener,noreferrer')
    open.mockRestore()
  })

  it('requires confirmation and deletes only the selected document', async () => {
    authMocks.mockUseAuth.mockReturnValue({ user: { permissions: ['project-documents.view', 'project-documents.manage'] } })
    const first = documentFixture('first', 'First document')
    apiMocks.mockGetProjectDocuments.mockResolvedValueOnce([first, documentFixture('second', 'Second document')]).mockResolvedValue([first])
    apiMocks.mockDeleteProjectDocument.mockResolvedValue({})
    render(<DocumentsPanel projectId="project-1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Second document' }))
    fireEvent.click(screen.getByRole('button', { name: 'common.delete: Second document' }))
    expect(apiMocks.mockDeleteProjectDocument).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel delete' }))
    expect(apiMocks.mockDeleteProjectDocument).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'common.delete: Second document' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    await waitFor(() => expect(apiMocks.mockDeleteProjectDocument).toHaveBeenCalledWith('project-1', 'second'))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Second document' })).not.toBeInTheDocument())
  })

  it('refreshes version history after uploading a version for the same selected document', async () => {
    authMocks.mockUseAuth.mockReturnValue({ user: { permissions: ['project-documents.view', 'project-documents.upload'] } })
    apiMocks.mockGetProjectDocumentVersions.mockResolvedValueOnce([]).mockResolvedValue([{
      id: 'version-2', projectDocumentId: 'doc-1', versionNumber: 2, fileName: 'revision-2.pdf',
      contentType: 'application/pdf', fileSizeBytes: 200, uploadedAtUtc: '2026-10-26T10:00:00Z', isActive: true,
    }])
    const { container } = render(<DocumentsPanel projectId="project-1" />)
    await screen.findByText('pages.projectDetails.documentsPanel.noVersions')
    fireEvent.click(screen.getByRole('button', { name: 'pages.projectDetails.documentsPanel.addVersion' }))
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(['revision'], 'revision-2.pdf', { type: 'application/pdf' })] } })
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'pages.projectDetails.documentsPanel.addVersion' }))
    expect(await screen.findByText('revision-2.pdf')).toBeInTheDocument()
    expect(apiMocks.mockGetProjectDocumentVersions).toHaveBeenCalledTimes(2)
    expect(apiMocks.mockAddProjectDocumentVersion).toHaveBeenCalledWith('project-1', 'doc-1', expect.objectContaining({ file: expect.any(File) }))
  })

  it('selects the newly uploaded document without losing folder context', async () => {
    authMocks.mockUseAuth.mockReturnValue({ user: { permissions: ['project-documents.view', 'project-documents.upload'] } })
    const old = documentFixture('old', 'Old contract', 'contracts')
    apiMocks.mockGetProjectDocuments.mockResolvedValueOnce([old]).mockResolvedValue([old, documentFixture('new', 'New contract', 'contracts')])
    apiMocks.mockUploadProjectDocument.mockResolvedValue({ id: 'new' })
    const { container, router } = render(<DocumentsPanel projectId="project-1" />, '/projects/project-1?tab=documents&folder=contracts&document=old')
    fireEvent.click(await screen.findByRole('button', { name: 'pages.projectDetails.documentsPanel.upload' }))
    fireEvent.change(screen.getByLabelText('pages.projectDetails.documentsPanel.columns.title'), { target: { value: 'New contract' } })
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(['new'], 'new.pdf', { type: 'application/pdf' })] } })
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'pages.projectDetails.documentsPanel.upload' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'New contract' })).toHaveAttribute('aria-pressed', 'true'))
    const query = new URLSearchParams(router.state.location.search)
    expect(query.get('folder')).toBe('contracts')
    expect(query.get('document')).toBe('new')
  })

  it('reports history failures and retries without changing the selected document', async () => {
    authMocks.mockUseAuth.mockReturnValue({ user: { permissions: ['project-documents.view'] } })
    apiMocks.mockGetProjectDocumentVersions.mockRejectedValueOnce(new Error('History unavailable')).mockResolvedValue([])
    render(<DocumentsPanel projectId="project-1" />)
    await screen.findByText('pages.projectDetails.documentsPanel.historyError')
    fireEvent.click(screen.getByRole('button', { name: 'common.refresh' }))
    expect(await screen.findByText('pages.projectDetails.documentsPanel.noVersions')).toBeInTheDocument()
    expect(apiMocks.mockGetProjectDocumentVersions).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: 'Specification' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps selected document context readable without mutation or download permissions', async () => {
    authMocks.mockUseAuth.mockReturnValue({ user: { permissions: ['project-documents.view'] } })
    render(<DocumentsPanel projectId="project-1" />)
    const selected = await screen.findByRole('region', { name: 'pages.projectDetails.documentsPanel.selectedDocument' })
    expect(selected).toHaveTextContent('Specification')
    expect(within(selected).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'pages.projectDetails.documentsPanel.upload' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'pages.projectDetails.documentsPanel.newFolder' })).not.toBeInTheDocument()
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
    const allFolders = screen.getAllByRole('button', { name: 'pages.projectDetails.documentsPanel.allFolders' })[0]
    expect(allFolders).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(folder)
    expect(folder).toHaveAttribute('aria-pressed', 'true')
    expect(allFolders).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(allFolders)
    expect(allFolders).toHaveAttribute('aria-pressed', 'true')
    expect(folder).toHaveAttribute('aria-pressed', 'false')
  })

  it('restores document selection, folder, status, and search from the project URL', async () => {
    authMocks.mockUseAuth.mockReturnValue({ user: { permissions: ['project-documents.view'] } })
    apiMocks.mockGetProjectDocuments.mockResolvedValue(['first', 'requested'].map((id) => ({
      id, projectId: 'project-1', documentFolderId: id === 'requested' ? 'contracts' : null,
      documentNumber: `DOC-${id}`, title: id === 'requested' ? 'Requested contract' : 'First document',
      fileName: `${id}.pdf`, contentType: 'application/pdf', fileSizeBytes: 100, currentVersionNumber: 1,
      status: id === 'requested' ? 3 : 1, tags: null, isActive: true,
    })))
    render(<DocumentsPanel projectId="project-1" />, '/projects/project-1?tab=documents&document=requested&folder=contracts&documentStatus=3&documentSearch=Requested')
    await waitFor(() => expect(apiMocks.mockGetProjectDocumentVersions).toHaveBeenCalledWith('project-1', 'requested'))
    expect(screen.getByLabelText('pages.projectDetails.documentsPanel.search')).toHaveValue('Requested')
    expect(screen.getByLabelText('pages.projectDetails.documentsPanel.statusFilter')).toHaveValue('3')
    expect(screen.getByText('Requested contract')).toBeInTheDocument()
    expect(screen.queryByText('First document')).not.toBeInTheDocument()
    expect(apiMocks.mockGetProjectDocumentVersions).not.toHaveBeenCalledWith('project-1', 'first')
  })

  it('does not fetch versions for a URL document absent from this project', async () => {
    authMocks.mockUseAuth.mockReturnValue({ user: { permissions: ['project-documents.view'] } })
    render(<DocumentsPanel projectId="project-1" />, '/projects/project-1?tab=documents&document=foreign-document')
    await screen.findByText('Specification')
    expect(apiMocks.mockGetProjectDocumentVersions).not.toHaveBeenCalled()
    expect(screen.queryByText('pages.projectDetails.documentsPanel.versions')).not.toBeInTheDocument()
  })

  it('keeps document filters in the URL when they change', async () => {
    authMocks.mockUseAuth.mockReturnValue({ user: { permissions: ['project-documents.view'] } })
    const { router } = render(<DocumentsPanel projectId="project-1" />)
    await screen.findByText('Specification')
    fireEvent.change(screen.getByLabelText('pages.projectDetails.documentsPanel.search'), { target: { value: 'spec' } })
    fireEvent.change(screen.getByLabelText('pages.projectDetails.documentsPanel.statusFilter'), { target: { value: '1' } })
    const query = new URLSearchParams(router.state.location.search)
    expect(query.get('tab')).toBe('documents')
    expect(query.get('documentSearch')).toBe('spec')
    expect(query.get('documentStatus')).toBe('1')
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
