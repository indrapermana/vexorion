import { describe, expect, it } from 'vitest'
import { ApiError } from '../../lib/api'
import { isUploadOutcomeUnknown } from './uploadRecovery'
import { useUploadRecovery } from './uploadRecovery'
import { act, renderHook } from '@testing-library/react'

describe('document upload recovery', () => {
  it('persists pending context across remounts, isolates tenants, and clears confirmed rejections', () => {
    sessionStorage.clear()
    const first = renderHook(() => useUploadRecovery('tenant-a'))
    act(() => first.result.current.begin('project-a', 'document-a'))
    first.unmount()
    const restored = renderHook(() => useUploadRecovery('tenant-a'))
    expect(restored.result.current.pending).toEqual({ projectId: 'project-a', documentId: 'document-a' })
    const other = renderHook(() => useUploadRecovery('tenant-b'))
    expect(other.result.current.pending).toBeNull()
    act(() => restored.result.current.failed(new ApiError(503, 'Unknown')))
    expect(restored.result.current.pending).not.toBeNull()
    act(() => restored.result.current.failed(new ApiError(413, 'Rejected')))
    expect(restored.result.current.pending).toBeNull()
    restored.unmount(); other.unmount(); sessionStorage.clear()
  })
  it.each([0, 408, 499, 500, 502, 503, 504])('treats status %s as an unknown outcome rather than a safe retry', (status) => {
    expect(isUploadOutcomeUnknown(new ApiError(status, 'Upload failed'))).toBe(true)
  })

  it.each([400, 401, 403, 404, 409, 413, 415, 422, 429, 507])('treats confirmed client rejection %s as known except server-side failures', (status) => {
    expect(isUploadOutcomeUnknown(new ApiError(status, 'Upload rejected'))).toBe(false)
  })

  it('treats transport and unexpected errors conservatively', () => {
    expect(isUploadOutcomeUnknown(new Error('Connection closed'))).toBe(true)
  })
})