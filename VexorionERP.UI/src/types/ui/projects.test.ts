/// <reference types="vitest/globals" />

import { getProjectLifecycleStatusLabel, getTenantRelationshipTypeLabel } from './projects'

describe('project ui state helpers', () => {
  it('maps all project lifecycle statuses to labels', () => {
    expect(getProjectLifecycleStatusLabel(1)).toBe('Draft')
    expect(getProjectLifecycleStatusLabel(2)).toBe('In review')
    expect(getProjectLifecycleStatusLabel(3)).toBe('Submitted')
    expect(getProjectLifecycleStatusLabel(4)).toBe('Awarded')
    expect(getProjectLifecycleStatusLabel(5)).toBe('Completed')
    expect(getProjectLifecycleStatusLabel(6)).toBe('Cancelled')
  })

  it('maps known relationship types and defaults consortium member for unknown', () => {
    expect(getTenantRelationshipTypeLabel(1)).toBe('Prime contractor')
    expect(getTenantRelationshipTypeLabel(2)).toBe('Subcontractor')
    expect(getTenantRelationshipTypeLabel(3)).toBe('Legal sponsor')
    expect(getTenantRelationshipTypeLabel(4)).toBe('Delivery partner')
    expect(getTenantRelationshipTypeLabel(5)).toBe('Customer')
    expect(getTenantRelationshipTypeLabel(6)).toBe('Vendor')
    expect(getTenantRelationshipTypeLabel(7)).toBe('Consortium member')
    expect(getTenantRelationshipTypeLabel(999 as 1)).toBe('Consortium member')
  })
})
