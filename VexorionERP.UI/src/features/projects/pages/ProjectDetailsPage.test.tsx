import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useState } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProjectDetailsPage from './ProjectDetailsPage'

const mocks = vi.hoisted(() => ({
  isAuthenticated: true,
  permissions: ['projects.view', 'projects.manage'],
  t: (key: string) => key,
  assignmentMount: vi.fn(),
  documentMount: vi.fn(),
  getProject: vi.fn(),
  getProjectCategories: vi.fn(),
  getProjectParties: vi.fn(),
  getProjectTimeline: vi.fn(),
  createProjectParty: vi.fn(),
  deleteProjectParty: vi.fn(),
  updateProject: vi.fn(),
  updateProjectParty: vi.fn(),
}))

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: mocks.t }) }))
vi.mock('../../../app/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mocks.isAuthenticated, user: { permissions: mocks.permissions } }),
}))
vi.mock('../../../lib/api', () => ({ ApiError: class ApiError extends Error {}, ...mocks }))
vi.mock('@vexorion/ui', async (importOriginal) => ({
  ...await importOriginal<typeof import('@vexorion/ui')>(),
  VxDataGrid: () => <div data-testid="project-grid" />,
}))
vi.mock('../components/AssignmentsPanel', () => ({
  default: function AssignmentsPanel({ projectId }: { projectId: string }) {
    const [draft, setDraft] = useState('')
    useEffect(() => { mocks.assignmentMount(projectId) }, [projectId])
    return <input aria-label="Assignment draft" value={draft} onChange={(event) => setDraft(event.target.value)} />
  },
}))
vi.mock('../components/DocumentsPanel', () => ({
  default: function DocumentsPanel({ projectId }: { projectId: string }) {
    const [filter, setFilter] = useState('')
    useEffect(() => { mocks.documentMount(projectId) }, [projectId])
    return <input aria-label="Document filter" value={filter} onChange={(event) => setFilter(event.target.value)} />
  },
}))

function renderProject(initialEntry: { pathname: string, search?: string, state?: { returnTo?: unknown } } = { pathname: '/projects/project-1', state: { returnTo: '/projects?search=contract' } }) {
  const router = createMemoryRouter([
    { path: '/projects/:projectId', element: <ProjectDetailsPage /> },
    { path: '/project-documents', element: <div>Document Center destination</div> },
  ], {
    initialEntries: [initialEntry],
  })
  render(<RouterProvider router={router} />)
  return router
}

function tab(name: string) {
  return screen.getByRole('tab', { name: `pages.projectDetails.tabs.${name}` })
}

describe('ProjectDetailsPage tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isAuthenticated = true
    mocks.permissions = ['projects.view', 'projects.manage']
    mocks.getProject.mockImplementation(async (id: string) => ({
      id, name: `Project ${id}`, projectCategoryId: 'category-1', projectNumber: 'P-001',
      startDate: '2026-10-01', status: 1, isActive: true,
    }))
    mocks.getProjectCategories.mockResolvedValue([{ id: 'category-1', code: 'CAT', name: 'Contracts' }])
    mocks.getProjectParties.mockResolvedValue([])
    mocks.getProjectTimeline.mockResolvedValue([])
  })

  it('links five tabs to named panels and supports keyboard selection', async () => {
    const user = userEvent.setup()
    renderProject()
    await screen.findByRole('heading', { name: 'Project project-1', level: 1 })
    expect(screen.getByRole('tablist', { name: 'pages.projectDetails.title' })).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(5)
    expect(screen.getByRole('tabpanel', { name: 'pages.projectDetails.tabs.overview' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'pages.projectDetails.backButton' })).toHaveAttribute('href', '/projects?search=contract')

    tab('overview').focus()
    await user.keyboard('{ArrowRight}')
    expect(tab('parties')).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(tab('parties')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'pages.projectDetails.tabs.parties' })).toHaveAttribute('id', tab('parties').getAttribute('aria-controls'))
    expect(screen.queryByRole('tabpanel', { name: 'pages.projectDetails.tabs.overview' })).not.toBeInTheDocument()

    for (const name of ['assignments', 'documents', 'history']) {
      await user.click(tab(name))
      expect(screen.getByRole('tabpanel', { name: `pages.projectDetails.tabs.${name}` })).toBeVisible()
    }
  })

  it('mounts child panels only on first visit and retains their state across tab changes', async () => {
    renderProject()
    await screen.findByRole('heading', { name: 'Project project-1', level: 1 })
    expect(mocks.assignmentMount).not.toHaveBeenCalled()
    expect(mocks.documentMount).not.toHaveBeenCalled()

    fireEvent.click(tab('assignments'))
    fireEvent.change(screen.getByRole('textbox', { name: 'Assignment draft' }), { target: { value: 'Site lead' } })
    fireEvent.click(tab('documents'))
    fireEvent.change(screen.getByRole('textbox', { name: 'Document filter' }), { target: { value: 'Contract' } })
    fireEvent.click(tab('history'))
    expect(screen.queryByRole('textbox', { name: 'Document filter' })).not.toBeInTheDocument()
    fireEvent.click(tab('assignments'))
    expect(screen.getByRole('textbox', { name: 'Assignment draft' })).toHaveValue('Site lead')
    fireEvent.click(tab('documents'))
    expect(screen.getByRole('textbox', { name: 'Document filter' })).toHaveValue('Contract')
    expect(mocks.assignmentMount).toHaveBeenCalledTimes(1)
    expect(mocks.documentMount).toHaveBeenCalledTimes(1)
  })

  it('resets the selected tab and retained child state when opening another project', async () => {
    const router = renderProject()
    await screen.findByRole('heading', { name: 'Project project-1', level: 1 })
    fireEvent.click(tab('documents'))
    fireEvent.change(screen.getByRole('textbox', { name: 'Document filter' }), { target: { value: 'Old project' } })

    await act(async () => { await router.navigate('/projects/project-2') })
    await screen.findByRole('heading', { name: 'Project project-2', level: 1 })
    expect(tab('overview')).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('textbox', { name: 'Document filter' })).not.toBeInTheDocument()
    fireEvent.click(tab('documents'))
    expect(screen.getByRole('textbox', { name: 'Document filter' })).toHaveValue('')
    expect(mocks.documentMount).toHaveBeenLastCalledWith('project-2')
    await waitFor(() => expect(mocks.getProject).toHaveBeenLastCalledWith('project-2'))
  })

  it('preserves read-only access without exposing project or party editing actions', async () => {
    mocks.permissions = ['projects.view']
    renderProject()
    await screen.findByRole('heading', { name: 'Project project-1', level: 1 })
    expect(screen.queryByRole('button', { name: 'pages.projectDetails.editButton' })).not.toBeInTheDocument()
    fireEvent.click(tab('parties'))
    expect(screen.queryByRole('button', { name: 'pages.projectDetails.parties.addButton' })).not.toBeInTheDocument()
    expect(screen.getByRole('tabpanel', { name: 'pages.projectDetails.tabs.parties' })).toBeVisible()
  })

  it('opens the URL-selected Documents tab and preserves both return destinations', async () => {
    mocks.permissions = ['projects.view', 'project-documents.view']
    const returnTo = '/project-documents?search=contract&status=3&tag=legal'
    const search = '?tab=documents&folder=contracts&document=document-2&documentSearch=contract'
    const router = renderProject({ pathname: '/projects/project-1', search, state: { returnTo } })
    await screen.findByRole('heading', { name: 'Project project-1', level: 1 })
    expect(tab('documents')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('link', { name: 'pages.projectDocuments.backToCenter' })).toHaveAttribute('href', returnTo)
    const centerLink = screen.getByRole('link', { name: 'pages.projectDocuments.title' })
    expect(centerLink).toHaveAttribute('href', '/project-documents?projectId=project-1')
    fireEvent.click(centerLink)
    expect(router.state.location.state.returnTo).toBe(`/projects/project-1${search}`)
    expect(router.state.location.state.returnState).toEqual({ returnTo })
  })

  it.each(['https://example.invalid', '//example.invalid', '/project-documents-unsafe'])('rejects an unsafe return destination: %s', async (returnTo) => {
    renderProject({ pathname: '/projects/project-1', state: { returnTo } })
    await screen.findByRole('heading', { name: 'Project project-1', level: 1 })
    expect(screen.getByRole('link', { name: 'pages.projectDetails.backButton' })).toHaveAttribute('href', '/projects')
  })

  it('falls back to Overview for an unknown tab and preserves document query state when switching tabs', async () => {
    const router = renderProject({ pathname: '/projects/project-1', search: '?tab=unknown&folder=contracts&document=document-2' })
    await screen.findByRole('heading', { name: 'Project project-1', level: 1 })
    expect(tab('overview')).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(tab('documents'))
    const query = new URLSearchParams(router.state.location.search)
    expect(query.get('tab')).toBe('documents')
    expect(query.get('folder')).toBe('contracts')
    expect(query.get('document')).toBe('document-2')
  })
})