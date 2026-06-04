/// <reference types="vitest/globals" />

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import AssignmentsPanel from './AssignmentsPanel'
import type {
  EmployeeListItemResponse,
  ProjectAssignableConsultantListItemResponse,
  ProjectAssignmentHistoryItemResponse,
  ProjectAssignmentListItemResponse,
} from '../../../types/api'

const apiMocks = vi.hoisted(() => ({
  mockGetProjectAssignments: vi.fn<() => Promise<ProjectAssignmentListItemResponse[]>>(),
  mockGetProjectAssignmentHistory: vi.fn<() => Promise<ProjectAssignmentHistoryItemResponse[]>>(),
  mockGetProjectAssignableEmployees: vi.fn<() => Promise<EmployeeListItemResponse[]>>(),
  mockGetProjectAssignableConsultants: vi.fn<() => Promise<ProjectAssignableConsultantListItemResponse[]>>(),
  mockCreateProjectAssignment: vi.fn(),
  mockUpdateProjectAssignment: vi.fn(),
  mockDeleteProjectAssignment: vi.fn(),
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
  createProjectAssignment: apiMocks.mockCreateProjectAssignment,
  deleteProjectAssignment: apiMocks.mockDeleteProjectAssignment,
  getProjectAssignmentHistory: apiMocks.mockGetProjectAssignmentHistory,
  getProjectAssignableConsultants: apiMocks.mockGetProjectAssignableConsultants,
  getProjectAssignableEmployees: apiMocks.mockGetProjectAssignableEmployees,
  getProjectAssignments: apiMocks.mockGetProjectAssignments,
  updateProjectAssignment: apiMocks.mockUpdateProjectAssignment,
}))

vi.mock('@vexorion/ui', () => {
  const passThrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>

  return {
    VxAlert: ({ children }: { children?: ReactNode }) => <div role="alert">{children}</div>,
    VxBox: passThrough,
    VxButton: ({ children, onClick, disabled }: { children?: ReactNode, onClick?: (event?: any) => void, disabled?: boolean }) => (
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
    }: {
      label?: string
      value?: string | number
      onChange?: (event: { target: { value: string } }) => void
      select?: boolean
      children?: ReactNode
      type?: string
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
            onChange={(event) => onChange?.({ target: { value: event.target.value } })}
          />
        </label>
      )
    ),
    VxTypography: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  }
})

describe('AssignmentsPanel assignment and relationship UI logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    apiMocks.mockGetProjectAssignments.mockResolvedValue([])
    apiMocks.mockGetProjectAssignmentHistory.mockResolvedValue([])
    apiMocks.mockGetProjectAssignableEmployees.mockResolvedValue([
      {
        id: 'emp-1',
        companyId: 'co-1',
        departmentId: null,
        employeeNumber: 'E-001',
        firstName: 'Alice',
        lastName: 'Ng',
        email: 'alice@example.com',
        jobTitle: 'Engineer',
        isActive: true,
      },
    ])
    apiMocks.mockGetProjectAssignableConsultants.mockResolvedValue([
      {
        id: 'con-1',
        tenantId: 'tenant-2',
        tenantCode: 'TEN-2',
        tenantName: 'Partner Tenant',
        consultantNumber: 'C-001',
        fullName: 'Bob Smith',
        organizationName: 'Partner Org',
        isExternal: true,
        isActive: true,
      },
    ])

    apiMocks.mockCreateProjectAssignment.mockResolvedValue({})
  })

  it('shows no-access alert when projects.view permission is missing', () => {
    authMocks.mockUseAuth.mockReturnValue({ user: { permissions: [] } })

    render(<AssignmentsPanel projectId="project-1" />)

    expect(screen.getByRole('alert')).toHaveTextContent('pages.projectDetails.assignmentsPanel.noAccess')
  })

  it('creates employee assignment payload from form state', async () => {
    authMocks.mockUseAuth.mockReturnValue({ user: { permissions: ['projects.view', 'projects.manage'] } })
    const user = userEvent.setup()

    render(<AssignmentsPanel projectId="project-1" />)

    await waitFor(() => {
      expect(apiMocks.mockGetProjectAssignableEmployees).toHaveBeenCalledWith('project-1')
    })

    await user.click(screen.getByRole('button', { name: 'pages.projectDetails.assignmentsPanel.add' }))

    await user.selectOptions(screen.getByLabelText('pages.projectDetails.assignmentsPanel.fields.assigneeId'), 'emp-1')
    await user.type(screen.getByLabelText('pages.projectDetails.assignmentsPanel.fields.roleTitle'), '  Planner  ')
    await user.type(screen.getByLabelText('pages.projectDetails.assignmentsPanel.fields.startDate'), '2026-05-13')

    await user.click(screen.getByRole('button', { name: 'common.create' }))

    await waitFor(() => {
      expect(apiMocks.mockCreateProjectAssignment).toHaveBeenCalledWith(
        'project-1',
        expect.objectContaining({
          employeeId: 'emp-1',
          consultantId: null,
          roleTitle: 'Planner',
          startDate: '2026-05-13',
        }),
      )
    })
  })

  it('switches to consultant mode and submits consultant assignment payload', async () => {
    authMocks.mockUseAuth.mockReturnValue({ user: { permissions: ['projects.view', 'projects.manage'] } })
    const user = userEvent.setup()

    render(<AssignmentsPanel projectId="project-1" />)

    await waitFor(() => {
      expect(apiMocks.mockGetProjectAssignableConsultants).toHaveBeenCalledWith('project-1')
    })

    await user.click(screen.getByRole('button', { name: 'pages.projectDetails.assignmentsPanel.add' }))

    await user.selectOptions(screen.getByLabelText('pages.projectDetails.assignmentsPanel.fields.assigneeType'), 'consultant')
    await user.selectOptions(screen.getByLabelText('pages.projectDetails.assignmentsPanel.fields.assigneeId'), 'con-1')
    await user.type(screen.getByLabelText('pages.projectDetails.assignmentsPanel.fields.roleTitle'), 'Consultant Reviewer')
    await user.type(screen.getByLabelText('pages.projectDetails.assignmentsPanel.fields.startDate'), '2026-05-13')

    await user.click(screen.getByRole('button', { name: 'common.create' }))

    await waitFor(() => {
      expect(apiMocks.mockCreateProjectAssignment).toHaveBeenCalledWith(
        'project-1',
        expect.objectContaining({
          employeeId: null,
          consultantId: 'con-1',
          roleTitle: 'Consultant Reviewer',
          startDate: '2026-05-13',
        }),
      )
    })
  })
})
