/**
 * Cross-tenant project E2E coverage.
 *
 * The authenticated bootstrap user represents tenant A. The test provisions a
 * temporary tenant B and the required active relationship through the API,
 * then exercises project creation and party linking through the browser UI.
 */
import { expect, test, uid } from './fixtures'
import { authenticatedApi, expectSuccessfulFixture, type CreatedEntity } from './api-helpers'

type OnboardTenantResponse = {
  tenantId: string
}

test('P1-1: tenant A creates a project and links tenant B', async ({ page }) => {
  test.setTimeout(60_000)
  const suffix = Date.now().toString()
  const tenantCode = `e2eb${suffix}`.slice(0, 40)
  const categoryCode = uid('E2ECT').slice(0, 50)
  const projectNumber = uid('E2E-PRJ').slice(0, 50)
  const projectName = `Cross-tenant project ${suffix}`
  const today = new Date().toISOString().slice(0, 10)

  let tenantBId: string | null = null
  let relationshipId: string | null = null
  let categoryId: string | null = null
  let projectId: string | null = null

  await page.goto('/')

  try {
    const onboardResult = await authenticatedApi<OnboardTenantResponse>(page, '/tenants/onboard', 'POST', {
      tenantName: `E2E Tenant B ${suffix}`,
      tenantCode,
      domain: null,
      companyName: `E2E Company B ${suffix}`,
      companyCode: tenantCode,
      adminUserName: `admin-${suffix}`,
      adminEmail: `admin-${suffix}@e2e.invalid`,
      adminPassword: 'E2eTenantB123!',
      firstName: 'E2E',
      lastName: 'Tenant B',
    })
    tenantBId = expectSuccessfulFixture(onboardResult, 'Tenant B onboarding').tenantId

    const relationshipResult = await authenticatedApi<CreatedEntity>(page, '/tenant-relationships', 'POST', {
      relatedTenantId: tenantBId,
      relationshipType: 2,
      effectiveFrom: today,
      effectiveTo: null,
      contractReference: `E2E-${suffix}`,
      scopeJson: JSON.stringify({
        canViewDocuments: true,
        canUploadDocuments: false,
        canAssignPeople: false,
      }),
    })
    relationshipId = expectSuccessfulFixture(relationshipResult, 'Tenant relationship creation').id

    const activateResult = await authenticatedApi<CreatedEntity>(page, `/tenant-relationships/${relationshipId}/activate`, 'POST', {
      effectiveFrom: today,
      effectiveTo: null,
      scopeJson: JSON.stringify({
        canViewDocuments: true,
        canUploadDocuments: false,
        canAssignPeople: false,
      }),
    })
    expectSuccessfulFixture(activateResult, 'Tenant relationship activation')

    const categoryResult = await authenticatedApi<CreatedEntity>(page, '/project-categories', 'POST', {
      code: categoryCode,
      name: `E2E Cross-tenant ${suffix}`,
      description: 'Temporary category for the cross-tenant project E2E test.',
    })
    categoryId = expectSuccessfulFixture(categoryResult, 'Project category creation').id

    await page.goto('/projects')
    await page.getByRole('button', { name: /new project/i }).click()

    const projectDialog = page.getByRole('dialog')
    await projectDialog.getByLabel(/category/i).click()
    await page.getByRole('option', { name: new RegExp(categoryCode, 'i') }).click()
    await projectDialog.getByLabel(/project number/i).fill(projectNumber)
    await projectDialog.getByLabel(/project name/i).fill(projectName)
    await projectDialog.getByLabel(/start date/i).fill(today)

    const createProjectResponse = page.waitForResponse((response) => (
      response.request().method() === 'POST'
      && response.url().endsWith('/api/projects')
    ))
    await projectDialog.getByRole('button', { name: /^create$/i }).click()
    const projectResponse = await createProjectResponse
    expect(projectResponse.ok(), `Project creation returned HTTP ${projectResponse.status()}.`).toBeTruthy()
    projectId = ((await projectResponse.json()) as CreatedEntity).id

    await expect(page.getByText(/project created/i)).toBeVisible()
    await page.goto(`/projects/${projectId}`)
    await expect(page.getByText(projectName, { exact: true })).toBeVisible()

    await page.getByRole('button', { name: /^parties$/i }).click()
    await page.getByRole('button', { name: /add (project )?party/i }).click()

    const partyDialog = page.getByRole('dialog')
    await partyDialog.getByLabel(/related tenant id/i).fill(tenantBId)

    const createPartyResponse = page.waitForResponse((response) => (
      response.request().method() === 'POST'
      && response.url().endsWith(`/api/projects/${projectId}/parties`)
    ))
    await partyDialog.getByRole('button', { name: /^create$/i }).click()
    const partyResponse = await createPartyResponse
    expect(partyResponse.ok(), `Project party creation returned HTTP ${partyResponse.status()}.`).toBeTruthy()

    await expect(page.getByText(/project party added/i)).toBeVisible()
    await expect(page.getByText(tenantBId, { exact: true })).toBeVisible()

    const persistedParties = expectSuccessfulFixture(
      await authenticatedApi<Array<{ relatedTenantId: string }>>(page, `/projects/${projectId}/parties`, 'GET'),
      'Project party verification',
    )
    expect(persistedParties).toEqual(expect.arrayContaining([
      expect.objectContaining({ relatedTenantId: tenantBId }),
    ]))
  } finally {
    if (!page.isClosed()) {
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
