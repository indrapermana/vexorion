/// <reference types="vitest/globals" />

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { MouseEventHandler, ReactNode } from 'react'
import ProjectDocumentsPage from './ProjectDocumentsPage'

const apiMocks = vi.hoisted(() => ({
  getProjectCategories: vi.fn(),
  getProjectDocumentDownload: vi.fn(),
  getProjects: vi.fn(),
  searchProjectDocuments: vi.fn(),
  uploadProjectDocument: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key }),
}))

vi.mock('../../../app/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: ['project-documents.view', 'project-documents.upload'] } }),
}))

vi.mock('../../../lib/api', () => ({
  ApiError: class ApiError extends Error {},
  ...apiMocks,
}))

vi.mock('@vexorion/ui', () => {
  const passThrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return {
    VxAlert: ({ children }: { children?: ReactNode }) => <div role="alert">{children}</div>,
    VxBox: passThrough,
    VxButton: ({ children, onClick, disabled }: { children?: ReactNode, onClick?: MouseEventHandler<HTMLButtonElement>, disabled?: boolean }) => <button type="button" onClick={onClick} disabled={disabled}>{children}</button>,
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

it('uploads a document from Document Center after selecting a project', async () => {
  apiMocks.getProjectCategories.mockResolvedValue([])
  apiMocks.getProjects.mockResolvedValue([{ id: 'project-1', projectNumber: 'P-001', name: 'Project One' }])
  apiMocks.searchProjectDocuments.mockResolvedValue([])
  apiMocks.uploadProjectDocument.mockResolvedValue({ id: 'document-1' })

  render(<ProjectDocumentsPage />)
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
