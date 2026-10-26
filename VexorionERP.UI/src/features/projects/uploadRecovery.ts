import { ApiError } from '../../lib/api'
import { useSyncExternalStore } from 'react'

type PendingUpload = { projectId: string, documentId?: string }
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }

export function useUploadRecovery(tenantId?: string) {
  const key = `vexorion.document-upload.pending:${tenantId ?? 'unknown'}`
  const value = useSyncExternalStore(subscribe, () => sessionStorage.getItem(key), () => null)
  const pending = value ? JSON.parse(value) as PendingUpload : null
  const write = (next: PendingUpload | null) => {
    if (next) sessionStorage.setItem(key, JSON.stringify(next))
    else sessionStorage.removeItem(key)
    listeners.forEach((listener) => listener())
  }
  return { pending, begin: (projectId: string, documentId?: string) => write({ projectId, documentId }), complete: () => write(null), failed: (error: unknown) => { if (!isUploadOutcomeUnknown(error)) write(null) } }
}

export function isUploadOutcomeUnknown(error: unknown): boolean {
  return !(error instanceof ApiError) || [0, 408, 499].includes(error.status) || (error.status >= 500 && error.status !== 507)
}