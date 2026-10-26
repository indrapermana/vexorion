import { describe, expect, it } from 'vitest'
import { readRelationshipScope, restrictedRelationshipScope, updateRelationshipScope } from './relationshipScope'

describe('relationship scope controls', () => {
  it('preserves legacy unrestricted scope but defaults absent explicit keys to denied', () => {
    expect(readRelationshipScope(null)).toEqual({ canViewDocuments: true, canUploadDocuments: true, canAssignPeople: true })
    expect(readRelationshipScope('{}')).toEqual({ canViewDocuments: false, canUploadDocuments: false, canAssignPeople: false })
    expect(readRelationshipScope(restrictedRelationshipScope)).toEqual({ canViewDocuments: false, canUploadDocuments: false, canAssignPeople: false })
  })

  it('honors backend aliases, string booleans, and canonical-key precedence', () => {
    expect(readRelationshipScope(JSON.stringify({ canViewDocuments: false, CanViewDocuments: true, documentsUpload: ' TRUE ', peopleAssign: true })))
      .toEqual({ canViewDocuments: false, canUploadDocuments: true, canAssignPeople: true })
  })

  it.each(['invalid', 'null', '[]', 'true', '42'])('fails closed for invalid or non-object scope: %s', (value) => {
    expect(readRelationshipScope(value)).toEqual({ canViewDocuments: false, canUploadDocuments: false, canAssignPeople: false })
  })

  it('updates named permissions without dropping unrelated scope properties', () => {
    const value = JSON.stringify({ canView: true, canAssignPeople: true, custom: { region: 'east' } })
    expect(JSON.parse(updateRelationshipScope(value, 'canUploadDocuments', true))).toEqual({
      canView: true, canViewDocuments: true, canUploadDocuments: true, canAssignPeople: true, custom: { region: 'east' },
    })
  })

  it('materializes the legacy permissions when one permission is explicitly disabled', () => {
    expect(JSON.parse(updateRelationshipScope('', 'canUploadDocuments', false)))
      .toEqual({ canViewDocuments: true, canUploadDocuments: false, canAssignPeople: true })
  })
})