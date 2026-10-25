import { describe, expect, it } from 'vitest'
import enUS from './locales/enUS'
import esES from './locales/esES'
import idID from './locales/idID'

describe('organization and project engagement vocabulary', () => {
  it('separates master records from project assignments in English', () => {
    expect(enUS.pages.employees.description).toContain('internal staff records')
    expect(enUS.pages.employees.description).toContain('does not staff a project')
    expect(enUS.pages.consultants.description).toContain('non-employee professional records')
    expect(enUS.pages.consultants.description).toContain('does not create a project engagement')
    expect(enUS.pages.projectDetails.assignmentsPanel.description).toContain('engages one employee or eligible consultant')
    expect(enUS.pages.projectDetails.assignmentsPanel.description).toContain('does not change the person\'s master record')
  })

  it('separates organization relationships, project partners, and person assignments', () => {
    expect(enUS.pages.tenantRelationships.boundary).toContain('organization level')
    expect(enUS.pages.tenantRelationships.boundary).toContain('does not add the organization to a project or assign a person')
    expect(enUS.pages.projectDetails.parties.title).toBe('Project partners')
    expect(enUS.pages.projectDetails.parties.description).toContain('links one related tenant organization to this project')
    expect(enUS.pages.projectDetails.parties.description).toContain('does not assign any employee or consultant')
    expect(enUS.pages.projectDetails.parties.fields.canAssignPeople).toBe('Allow consultants from this tenant')
  })

  it.each([
    ['English', enUS],
    ['Indonesian', idID],
    ['Spanish', esES],
  ])('provides the complete vocabulary guidance in %s', (_name, locale) => {
    expect(locale.pages.employees.description).toBeTruthy()
    expect(locale.pages.consultants.description).toBeTruthy()
    expect(locale.pages.tenantRelationships.boundary).toBeTruthy()
    expect(locale.pages.tenantRelationships.fields.relatedTenantHelp).toBeTruthy()
    expect(locale.pages.tenantRelationships.fields.scopeJsonHelp).toBeTruthy()
    expect(locale.pages.projectDetails.assignmentsPanel.description).toBeTruthy()
    expect(locale.pages.projectDetails.assignmentsPanel.fields.assigneeHelp).toBeTruthy()
    expect(locale.pages.projectDetails.parties.description).toBeTruthy()
    expect(locale.pages.projectDetails.parties.dialogGuidance).toBeTruthy()
    expect(locale.pages.projectDetails.parties.fields.relatedTenantHelp).toBeTruthy()
  })
})
