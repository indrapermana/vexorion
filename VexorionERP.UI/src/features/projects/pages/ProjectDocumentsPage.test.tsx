/// <reference types="vitest/globals" />

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { MouseEventHandler, ReactNode } from 'react'
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom'
import ProjectDocumentsPage from './ProjectDocumentsPage'

const apiMocks = vi.hoisted(() => ({
  getProjectCategories: vi.fn(),
  getProjectDocumentDownload: vi.fn(),
  getProjects: vi.fn(),
  searchProjectDocuments: vi.fn(),
  uploadProjectDocument: vi.fn(),
  t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key,
  permissions: ['project-documents.view', 'project-documents.upload'],
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: apiMocks.t }),
}))

vi.mock('../../../app/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: apiMocks.permissions } }),
}))

vi.mock('../../../lib/api', () => ({
  ApiError: class ApiError extends Error {},
  ...apiMocks,
}))

vi.mock('@vexorion/ui', () => {
  const passThrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return {
    OpenInNewRoundedIcon: () => <span aria-hidden="true" />,
    VxAlert: ({ children }: { children?: ReactNode }) => <div role="alert">{children}</div>,
    VxBox: passThrough,
    VxButton: ({ children, onClick, disabled, to, state }: { children?: ReactNode, onClick?: MouseEventHandler<HTMLButtonElement>, disabled?: boolean, to?: string, state?: unknown }) => to ? <Link to={to} state={state}>{children}</Link> : <button type="button" onClick={onClick} disabled={disabled}>{children}</button>,
    VxChip: ({ label }: { label: string }) => <span>{label}</span>,
    VxCircularProgress: () => <span>loading</span>,
    VxDialog: ({ open, children }: { open: boolean, children?: ReactNode }) => open ? <div role="dialog">{children}</div> : null,
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
    VxTextField: ({ label, value, onChange, select, children, type }: { label?: string, value?: unknown, onChange?: (event: { target: { value: string } }) => void, select?: boolean, children?: ReactNode, type?: string }) => select ? (
      <label>{label}<select aria-label={label} value={String(value ?? '')} onChange={(event) => onChange?.(event)}>{children}</select></label>
    ) : (
      <label>{label}<input aria-label={label} type={type ?? 'text'} value={String(value ?? '')} onChange={(event) => onChange?.(event)} /></label>
    ),
    VxTypography: passThrough,
  }
})

function renderCenter(initialEntry: string | { pathname: string, search?: string, state?: { returnTo?: unknown, returnState?: unknown } } = '/project-documents') {
  const router = createMemoryRouter([
    { path: '/project-documents', element: <ProjectDocumentsPage /> },
    { path: '/projects/:projectId', element: <div>Project destination</div> },
  ], { initialEntries: [initialEntry] })
  const result = render(<RouterProvider router={router} />)
  return { ...result, router }
}

beforeEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
  apiMocks.permissions = ['project-documents.view', 'project-documents.upload']
  apiMocks.getProjectCategories.mockResolvedValue([])
  apiMocks.getProjects.mockResolvedValue([{ id: 'project-1', projectNumber: 'P-001', name: 'Project One' }])
  apiMocks.searchProjectDocuments.mockResolvedValue([])
  apiMocks.uploadProjectDocument.mockResolvedValue({ id: 'document-1' })
})

it('uploads a document from Document Center after selecting a project', async () => {
  renderCenter()
  await waitFor(() => expect(apiMocks.getProjects).toHaveBeenCalled())
  fireEvent.click(screen.getByRole('button', { name: 'Upload document' }))

  const dialog = screen.getByRole('dialog')
  fireEvent.change(screen.getAllByLabelText('Project').at(-1)!, { target: { value: 'project-1' } })
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Contract' } })
  const file = new File(['document'], 'contract.pdf', { type: 'application/pdf' })
  fireEvent.change(screen.getByLabelText('File'), { target: { files: [file] } })
  fireEvent.click(Array.from(dialog.querySelectorAll('button')).find((button) => button.textContent === 'Upload document')!)

  await waitFor(() => expect(apiMocks.uploadProjectDocument).toHaveBeenCalledWith('project-1', {
    title: 'Contract', tags: undefined, notes: undefined, file,
  }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Document uploaded.')
})

it('restores all search filters from the URL with inclusive UTC date boundaries', async () => {
  apiMocks.getProjectCategories.mockResolvedValue([{ id: 'category-1', code: 'CAT', name: 'Contracts' }])
  renderCenter('/project-documents?projectId=project-1&projectCategoryId=category-1&status=3&tag=legal&search=contract&fromDate=2026-10-01&toDate=2026-10-26')

  await waitFor(() => expect(apiMocks.searchProjectDocuments).toHaveBeenLastCalledWith({
    projectId: 'project-1', projectCategoryId: 'category-1', status: 3, tag: 'legal', searchTerm: 'contract',
    fromUtc: '2026-10-01T00:00:00.000Z', toUtc: '2026-10-26T23:59:59.999Z',
  }))
  expect(screen.getByLabelText('Project')).toHaveValue('project-1')
  expect(screen.getByLabelText('Category')).toHaveValue('category-1')
  expect(screen.getByLabelText('Status')).toHaveValue('3')
  expect(screen.getByLabelText('Search')).toHaveValue('contract')
  expect(screen.getByLabelText('Tag')).toHaveValue('legal')
  expect(screen.getByLabelText('From date')).toHaveValue('2026-10-01')
  expect(screen.getByLabelText('To date')).toHaveValue('2026-10-26')
})

it('updates the URL and restores filters on browser Back navigation', async () => {
  const { router } = renderCenter('/project-documents?search=first')
  fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'updated' } })
  expect(new URLSearchParams(router.state.location.search).get('search')).toBe('updated')
  await act(async () => { await router.navigate('/project-documents?search=second&status=2') })
  expect(screen.getByLabelText('Search')).toHaveValue('second')
  expect(screen.getByLabelText('Status')).toHaveValue('2')
  await act(async () => { await router.navigate(-1) })
  expect(screen.getByLabelText('Search')).toHaveValue('updated')
  expect(screen.getByLabelText('Status')).toHaveValue('')
})

it('keeps restored project and category values while lookup options are loading', () => {
  apiMocks.getProjects.mockImplementationOnce(() => new Promise(() => {}))
  renderCenter('/project-documents?projectId=pending-project&projectCategoryId=pending-category')
  expect(screen.getByLabelText('Project')).toHaveValue('pending-project')
  expect(screen.getByLabelText('Category')).toHaveValue('pending-category')
})

it('resets managed filters without deleting unrelated URL parameters', async () => {
  const { router } = renderCenter('/project-documents?search=contract&status=3&tag=legal&context=retained')
  fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }))
  expect(router.state.location.search).toBe('?context=retained')
  expect(screen.getByLabelText('Search')).toHaveValue('')
  expect(screen.getByLabelText('Status')).toHaveValue('')
})

function documentRow(id: string, title: string) {
  return {
    id, title, projectId: 'project-1', projectNumber: 'P-001', projectName: 'Project One',
    projectCategoryId: 'category-1', projectCategoryCode: 'CAT', documentNumber: `DOC-${id}`,
    fileName: 'contract.pdf', fileSizeBytes: 100, status: 3, createdAtUtc: '2026-10-26T10:00:00Z',
  }
}

it('opens the selected document in its project and restores the filtered center on Back', async () => {
  apiMocks.permissions = ['project-documents.view', 'projects.view']
  apiMocks.searchProjectDocuments.mockResolvedValue([documentRow('document-2', 'Contract')])
  const entry = '/project-documents?projectId=project-1&status=3&search=contract&tag=legal'
  const { router } = renderCenter(entry)
  const link = await screen.findByRole('link', { name: 'pages.projectDocuments.openInProject' })
  expect(link).toHaveAttribute('href', '/projects/project-1?tab=documents&document=document-2')
  fireEvent.click(link)
  expect(router.state.location.state.returnTo).toBe(entry)
  await act(async () => { await router.navigate(-1) })
  expect(screen.getByLabelText('Search')).toHaveValue('contract')
  expect(screen.getByLabelText('Tag')).toHaveValue('legal')
  expect(screen.getByLabelText('Status')).toHaveValue('3')
})

it('does not offer project navigation without project-view permission', async () => {
  apiMocks.searchProjectDocuments.mockResolvedValue([documentRow('document-1', 'Contract')])
  renderCenter()
  await screen.findByText('Contract')
  expect(screen.queryByRole('link', { name: 'pages.projectDocuments.openInProject' })).not.toBeInTheDocument()
})

it('returns to the originating project document context but rejects external return destinations', async () => {
  apiMocks.permissions = ['project-documents.view', 'projects.view']
  const { router, unmount } = renderCenter({ pathname: '/project-documents', search: '?projectId=project-1', state: { returnTo: '/projects/project-1?tab=documents&folder=contracts&document=document-2', returnState: { returnTo: '/project-documents?search=legal' } } })
  expect(screen.getByRole('link', { name: 'pages.projectDocuments.backToProject' })).toHaveAttribute('href', '/projects/project-1?tab=documents&folder=contracts&document=document-2')
  fireEvent.click(screen.getByRole('link', { name: 'pages.projectDocuments.backToProject' }))
  expect(router.state.location.state.returnTo).toBe('/project-documents?search=legal')
  unmount()
  renderCenter({ pathname: '/project-documents', state: { returnTo: 'https://example.invalid' } })
  expect(screen.queryByRole('link', { name: 'pages.projectDocuments.backToProject' })).not.toBeInTheDocument()
})

it('ignores an older search response after the filters have changed', async () => {
  let resolveOld!: (rows: ReturnType<typeof documentRow>[]) => void
  apiMocks.searchProjectDocuments.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
    .mockResolvedValueOnce([documentRow('latest', 'Latest contract')])
  renderCenter('/project-documents?search=old')
  await waitFor(() => expect(apiMocks.searchProjectDocuments).toHaveBeenCalled())
  fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'latest' } })
  await screen.findByText('Latest contract')
  await act(async () => { resolveOld([documentRow('old', 'Old contract')]) })
  expect(screen.getByText('Latest contract')).toBeInTheDocument()
  expect(screen.queryByText('Old contract')).not.toBeInTheDocument()
})
