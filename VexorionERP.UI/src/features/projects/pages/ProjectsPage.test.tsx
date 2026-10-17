/// <reference types="vitest/globals" />

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { MouseEventHandler, ReactNode } from 'react'
import ProjectsPage from './ProjectsPage'

const apiMocks = vi.hoisted(() => ({
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  getProject: vi.fn(),
  getProjectCategories: vi.fn(),
  getProjects: vi.fn(),
  updateProject: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('../../../app/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }))
vi.mock('../../../lib/api', () => ({
  ApiError: class ApiError extends Error {},
  ...apiMocks,
}))

vi.mock('@vexorion/ui', () => {
  const passThrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>

  return {
    AddRoundedIcon: () => null,
    DeleteOutlineRoundedIcon: () => null,
    EditRoundedIcon: () => null,
    VxAlert: ({ children }: { children?: ReactNode }) => <div role="alert">{children}</div>,
    VxBox: passThrough,
    VxButton: ({ children, onClick, disabled }: { children?: ReactNode, onClick?: MouseEventHandler<HTMLButtonElement>, disabled?: boolean }) => (
      <button type="button" onClick={onClick} disabled={disabled}>{children}</button>
    ),
    VxChip: ({ label }: { label: string }) => <span>{label}</span>,
    VxDataGrid: ({ rows, columns }: { rows: Array<{ id: string }>, columns: Array<{ field: string, getActions?: (value: { row: unknown }) => ReactNode[] }> }) => (
      <div>
        {rows.map((row) => (
          <div key={row.id}>
            {columns.find((column) => column.field === 'actions')?.getActions?.({ row })}
          </div>
        ))}
      </div>
    ),
    VxDialog: ({ open, children }: { open: boolean, children?: ReactNode }) => (open ? <div>{children}</div> : null),
    VxDialogActions: passThrough,
    VxDialogContent: passThrough,
    VxDialogTitle: passThrough,
    VxGridActionsCellItem: ({ label, onClick }: { label: string, onClick: MouseEventHandler<HTMLButtonElement> }) => (
      <button type="button" onClick={onClick}>{label}</button>
    ),
    VxMenuItem: ({ children, value }: { children?: ReactNode, value: string | number }) => <option value={value}>{children}</option>,
    VxPaper: passThrough,
    VxStack: passThrough,
    VxTextField: ({ label, value, onChange, select, children, type }: {
      label?: string
      value?: string | number
      onChange?: (event: { target: { value: string } }) => void
      select?: boolean
      children?: ReactNode
      type?: string
    }) => select ? (
      <label>{label}<select aria-label={label} value={String(value ?? '')} onChange={(event) => onChange?.({ target: { value: event.target.value } })}>{children}</select></label>
    ) : (
      <label>{label}<input aria-label={label} type={type ?? 'text'} value={String(value ?? '')} onChange={(event) => onChange?.({ target: { value: event.target.value } })} /></label>
    ),
    VxTypography: passThrough,
  }
})

const projectListItem = {
  id: 'project-1',
  projectCategoryId: 'category-1',
  projectNumber: 'P-001',
  name: 'Original project',
  startDate: '2026-05-01',
  endDate: null,
  status: 1,
  isActive: true,
}

describe('ProjectsPage form state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.getProjectCategories.mockResolvedValue([{ id: 'category-1', code: 'CAT', name: 'Category', isActive: true }])
    apiMocks.getProjects.mockResolvedValue([projectListItem])
    apiMocks.getProject.mockResolvedValue({
      ...projectListItem,
      tenantId: 'tenant-1',
      governmentAgency: 'Ministry A',
      submissionReference: 'SUB-42',
      notes: 'Preserve this note',
    })
    apiMocks.updateProject.mockResolvedValue({})
  })

  it('loads complete project details before editing and preserves non-list fields', async () => {
    const user = userEvent.setup()
    render(<ProjectsPage />)

    await user.click(await screen.findByRole('button', { name: 'common.edit' }))
    await waitFor(() => expect(apiMocks.getProject).toHaveBeenCalledWith('project-1'))

    expect(screen.getByLabelText('pages.projects.fields.governmentAgency')).toHaveValue('Ministry A')
    expect(screen.getByLabelText('pages.projects.fields.submissionReference')).toHaveValue('SUB-42')
    expect(screen.getByLabelText('pages.projects.fields.notes')).toHaveValue('Preserve this note')

    await user.click(screen.getByRole('button', { name: 'common.save' }))
    await waitFor(() => expect(apiMocks.updateProject).toHaveBeenCalledWith('project-1', expect.objectContaining({
      governmentAgency: 'Ministry A',
      submissionReference: 'SUB-42',
      notes: 'Preserve this note',
    })))
  })

  it('blocks saving when the project end date is earlier than its start date', async () => {
    const user = userEvent.setup()
    render(<ProjectsPage />)
    await user.click(await screen.findByRole('button', { name: 'common.edit' }))
    await screen.findByDisplayValue('Ministry A')

    await user.type(screen.getByLabelText('pages.projects.fields.endDate'), '2026-04-30')

    expect(screen.getByRole('alert')).toHaveTextContent('pages.projects.errors.invalidPeriod')
    expect(screen.getByRole('button', { name: 'common.save' })).toBeDisabled()
    expect(apiMocks.updateProject).not.toHaveBeenCalled()
  })
})
