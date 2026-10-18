/**
 * Project relationship authorization E2E coverage.
 *
 * Creates a bounded, view-only tenant relationship and verifies through the
 * project UI that broader permissions and out-of-window dates are rejected,
 * while the exact permitted scope and validity period can be persisted.
 */
import { expect, test, uid } from './fixtures'
import { authenticatedApi, expectSuccessfulFixture, type CreatedEntity } from './api-helpers'

type OnboardTenantResponse = {
  tenantId: string
}

function utcDateFromToday(days: number): string {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

test('P1-1: relationship scope and validity dates allow and deny project-party access exactly', async ({ page }) => {
  test.setTimeout(75_000)

  const suffix = Date.now().toString()
  const tenantCode = `e2escope${suffix}`.slice(0, 40)
  const categoryCode = uid('E2ESCOPE').slice(0, 50)
  const projectNumber = uid('E2E-SCOPE-PRJ').slice(0, 50)
  const projectName = `Relationship authorization project ${suffix}`
  const relationshipFrom = utcDateFromToday(-1)
  const relationshipTo = utcDateFromToday(10)
  const outsideRelationshipTo = utcDateFromToday(11)

  let tenantBId: string | null = null
  let relationshipId: string | null = null
  let categoryId: string | null = null
  let projectId: string | null = null
  let projectPartyId: string | null = null

  await page.goto('/')

  try {
    tenantBId = expectSuccessfulFixture(
      await authenticatedApi<OnboardTenantResponse>(page, '/tenants/onboard', 'POST', {
        tenantName: `E2E Scope Tenant ${suffix}`,
        tenantCode,
        domain: null,
        companyName: `E2E Scope Company ${suffix}`,
        companyCode: tenantCode,
        adminUserName: `admin-${suffix}`,
        adminEmail: `admin-${suffix}@e2e.invalid`,
        adminPassword: 'E2eTenantB123!',
        firstName: 'E2E',
        lastName: 'Scope Tenant',
      }),
      'Scope tenant onboarding',
    ).tenantId

    relationshipId = expectSuccessfulFixture(
      await authenticatedApi<CreatedEntity>(page, '/tenant-relationships', 'POST', {
        relatedTenantId: tenantBId,
        relationshipType: 2,
        effectiveFrom: relationshipFrom,
        effectiveTo: relationshipTo,
        contractReference: `E2E-SCOPE-${suffix}`,
        scopeJson: JSON.stringify({
          canViewDocuments: true,
          canUploadDocuments: false,
          canAssignPeople: false,
        }),
      }),
      'Tenant relationship creation',
    ).id

    expectSuccessfulFixture(
      await authenticatedApi<CreatedEntity>(page, `/tenant-relationships/${relationshipId}/activate`, 'POST', {
        effectiveFrom: relationshipFrom,
        effectiveTo: relationshipTo,
        scopeJson: JSON.stringify({
          canViewDocuments: true,
          canUploadDocuments: false,
          canAssignPeople: false,
        }),
      }),
      'Tenant relationship activation',
    )

    categoryId = expectSuccessfulFixture(
      await authenticatedApi<CreatedEntity>(page, '/project-categories', 'POST', {
        code: categoryCode,
        name: `E2E Relationship Scope ${suffix}`,
        description: 'Temporary category for relationship authorization E2E coverage.',
      }),
      'Project category creation',
    ).id

    projectId = expectSuccessfulFixture(
      await authenticatedApi<CreatedEntity>(page, '/projects', 'POST', {
        projectCategoryId: categoryId,
        projectNumber,
        name: projectName,
        governmentAgency: null,
        submissionReference: null,
        startDate: relationshipFrom,
        endDate: null,
        status: 1,
        notes: 'Temporary project for relationship authorization E2E coverage.',
      }),
      'Project creation',
    ).id

    await page.goto(`/projects/${projectId}`)
    await expect(page.getByText(projectName, { exact: true })).toBeVisible()
    await page.getByRole('button', { name: /^parties$/i }).click()
    await page.getByRole('button', { name: /add (project )?party/i }).click()

    const partyDialog = page.getByRole('dialog')
    await partyDialog.getByLabel(/related tenant id/i).fill(tenantBId)
    await partyDialog.getByLabel(/effective from/i).fill(relationshipFrom)
    await partyDialog.getByLabel(/effective to/i).fill(relationshipTo)

    await partyDialog.getByLabel(/can upload documents/i).click()
    await page.getByRole('option', { name: /^active$/i }).click()

    const scopeDeniedResponsePromise = page.waitForResponse((response) => (
      response.request().method() === 'POST'
      && response.url().endsWith(`/api/projects/${projectId}/parties`)
    ))
    await partyDialog.getByRole('button', { name: /^create$/i }).click()
    const scopeDeniedResponse = await scopeDeniedResponsePromise
    expect(scopeDeniedResponse.status()).toBe(403)
    await expect(page.getByText('Tenant relationship scope does not allow one or more requested project party permissions.')).toBeVisible()

    await partyDialog.getByLabel(/can upload documents/i).click()
    await page.getByRole('option', { name: /^inactive$/i }).click()
    await partyDialog.getByLabel(/effective to/i).fill(outsideRelationshipTo)

    const dateDeniedResponsePromise = page.waitForResponse((response) => (
      response.request().method() === 'POST'
      && response.url().endsWith(`/api/projects/${projectId}/parties`)
    ))
    await partyDialog.getByRole('button', { name: /^create$/i }).click()
    const dateDeniedResponse = await dateDeniedResponsePromise
    expect(dateDeniedResponse.status()).toBe(400)
    await expect(page.getByText('Project party effective period must be within the active tenant relationship period.')).toBeVisible()

    await partyDialog.getByLabel(/effective to/i).fill(relationshipTo)

    const allowedResponsePromise = page.waitForResponse((response) => (
      response.request().method() === 'POST'
      && response.url().endsWith(`/api/projects/${projectId}/parties`)
    ))
    await partyDialog.getByRole('button', { name: /^create$/i }).click()
    const allowedResponse = await allowedResponsePromise
    expect(allowedResponse.ok(), `Allowed project-party creation returned HTTP ${allowedResponse.status()}.`).toBeTruthy()
    projectPartyId = ((await allowedResponse.json()) as CreatedEntity).id

    await expect(page.getByText(/project party added/i)).toBeVisible()
    await expect(page.getByText(tenantBId, { exact: true })).toBeVisible()

    const persistedParties = expectSuccessfulFixture(
      await authenticatedApi<Array<{
        id: string
        relatedTenantId: string
        canViewDocuments: boolean
        canUploadDocuments: boolean
        canAssignPeople: boolean
        effectiveFrom: string
        effectiveTo: string
      }>>(page, `/projects/${projectId}/parties`, 'GET'),
      'Authorized project party verification',
    )
    expect(persistedParties).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: projectPartyId,
        relatedTenantId: tenantBId,
        canViewDocuments: true,
        canUploadDocuments: false,
        canAssignPeople: false,
        effectiveFrom: relationshipFrom,
        effectiveTo: relationshipTo,
      }),
    ]))
  } finally {
    if (!page.isClosed()) {
      if (projectPartyId && projectId) {
        await authenticatedApi(page, `/projects/${projectId}/parties/${projectPartyId}`, 'DELETE')
      }
      if (projectId) {
        await authenticatedApi(page, `/projects/${projectId}`, 'DELETE')
      }
      if (categoryId) {
        await authenticatedApi(page, `/project-categories/${categoryId}`, 'DELETE')
      }
      if (relationshipId) {
        await authenticatedApi(page, `/tenant-relationships/${relationshipId}`, 'DELETE')
      }
      if (tenantBId) {
        await authenticatedApi(page, `/tenants/${tenantBId}`, 'DELETE')
      }
    }
  }
})
