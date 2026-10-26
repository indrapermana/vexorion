export type RelationshipScope = {
  canViewDocuments: boolean
  canUploadDocuments: boolean
  canAssignPeople: boolean
}

const aliases: Record<keyof RelationshipScope, string[]> = {
  canViewDocuments: ['canViewDocuments', 'CanViewDocuments', 'documentsView', 'canView'],
  canUploadDocuments: ['canUploadDocuments', 'CanUploadDocuments', 'documentsUpload', 'canUpload'],
  canAssignPeople: ['canAssignPeople', 'CanAssignPeople', 'peopleAssign', 'canAssign'],
}

function parseScope(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value)
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

export function readRelationshipScope(value: string | null | undefined): RelationshipScope {
  if (!value?.trim()) return { canViewDocuments: true, canUploadDocuments: true, canAssignPeople: true }
  const scope = parseScope(value)
  const allowed = (key: keyof RelationshipScope) => {
    for (const alias of aliases[key]) {
      const entry = scope[alias]
      if (typeof entry === 'boolean') return entry
      if (typeof entry === 'string' && /^(true|false)$/i.test(entry.trim())) return entry.trim().toLowerCase() === 'true'
    }
    return false
  }
  return {
    canViewDocuments: allowed('canViewDocuments'),
    canUploadDocuments: allowed('canUploadDocuments'),
    canAssignPeople: allowed('canAssignPeople'),
  }
}

export function updateRelationshipScope(value: string, key: keyof RelationshipScope, enabled: boolean): string {
  return JSON.stringify({ ...parseScope(value), ...readRelationshipScope(value), [key]: enabled })
}

export const restrictedRelationshipScope = JSON.stringify({ canViewDocuments: false, canUploadDocuments: false, canAssignPeople: false })