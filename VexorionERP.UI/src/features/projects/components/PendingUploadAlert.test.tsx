import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import PendingUploadAlert from './PendingUploadAlert'

const api = vi.hoisted(() => ({ getProjectDocuments: vi.fn(), getProjectDocumentVersions: vi.fn() }))
vi.mock('../../../lib/api', () => api)
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
beforeEach(() => { vi.clearAllMocks(); api.getProjectDocuments.mockResolvedValue([]); api.getProjectDocumentVersions.mockResolvedValue([]) })

it('requires successful refresh and explicit confirmation before discarding an unknown attempt', async () => {
  const discard = vi.fn()
  render(<MemoryRouter><PendingUploadAlert pending={{ projectId: 'project-1', documentId: 'document-1' }} busy={false} onDiscard={discard} /></MemoryRouter>)
  const button = screen.getByRole('button', { name: 'pages.projectDetails.documentsPanel.discardAttempt' })
  expect(button).toBeDisabled()
  expect(screen.getByRole('link')).toHaveAttribute('href', '/projects/project-1?tab=documents&document=document-1')
  fireEvent.click(screen.getByRole('button', { name: 'common.refresh' }))
  await waitFor(() => expect(button).toBeEnabled())
  expect(api.getProjectDocumentVersions).toHaveBeenCalledWith('project-1', 'document-1')
  fireEvent.click(button)
  expect(discard).not.toHaveBeenCalled()
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'pages.projectDetails.documentsPanel.discardAttempt' }))
  await waitFor(() => expect(discard).toHaveBeenCalledTimes(1))
})

it('keeps the pending attempt blocked when refreshing fails', async () => {
  api.getProjectDocuments.mockRejectedValue(new Error('Offline'))
  render(<MemoryRouter><PendingUploadAlert pending={{ projectId: 'project-1' }} busy={false} onDiscard={vi.fn()} /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'common.refresh' }))
  expect(await screen.findByText('pages.projectDetails.documentsPanel.reconcileFailed')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'pages.projectDetails.documentsPanel.discardAttempt' })).toBeDisabled()
})