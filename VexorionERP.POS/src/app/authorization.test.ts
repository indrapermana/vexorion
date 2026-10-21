import { describe, expect, it } from 'vitest'
import { PosPermissions, hasAllPosPermissions, posWorkspacePermissions } from './authorization'

describe('POS authorization matrix', () => {
  it('requires every read permission before mounting the sales workspace', () => {
    expect(hasAllPosPermissions(posWorkspacePermissions, posWorkspacePermissions)).toBe(true)
    expect(hasAllPosPermissions(posWorkspacePermissions.filter((permission) => permission !== PosPermissions.sales.view), posWorkspacePermissions)).toBe(false)
  })

  it('uses the backend shift-close permission identifier', () => {
    expect(PosPermissions.shiftClose).toBe('pos.shift_close')
  })
})
