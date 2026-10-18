/**
 * Storage threshold E2E coverage.
 *
 * Threshold summaries are isolated at the browser boundary so each dashboard
 * state is deterministic. The hard quota path remains a real API request and
 * must reject before the disabled development Blob Storage account is called.
 */
import { expect, test, uid, LoginPageObject } from './fixtures'
import { authenticatedApi, expectSuccessfulFixture, type CreatedEntity } from './api-helpers'

type OnboardTenantResponse = {
  tenantId: string
}

test('P1-1: show storage thresholds and reject uploads beyond the hard quota', async ({ page, browser }) => {
  test.setTimeout(90_000)

  const suffix = Date.now().toString()
  const tenantCode = `e2estorage${suffix}`.slice(0, 40)
  const tenantPassword = 'E2eStorage123!'
  const tenantUsername = `admin-${suffix}`
  const categoryCode = uid('E2ESTOR').slice(0, 50)
  const projectNumber = uid('E2E-STOR-PRJ').slice(0, 50)
  const projectName = `Storage threshold project ${suffix}`
  const quotaBytes = 64
  const today = new Date().toISOString().slice(0, 10)

  let tenantId: string | null = null
  let tenantContext: Awaited<ReturnType<typeof browser.newContext>> | null = null

  await page.goto('/')

  try {
    tenantId = expectSuccessfulFixture(
      await authenticatedApi<OnboardTenantResponse>(page, '/tenants/onboard', 'POST', {
        tenantName: `E2E Storage Tenant ${suffix}`,
        tenantCode,
        domain: null,
        companyName: `E2E Storage Company ${suffix}`,
        companyCode: tenantCode,
        adminUserName: tenantUsername,
        adminEmail: `${tenantUsername}@e2e.invalid`,
        adminPassword: tenantPassword,
        firstName: 'E2E',
        lastName: 'Storage Tenant',
      }),
      'Storage tenant onboarding',
    ).tenantId

    expectSuccessfulFixture(
      await authenticatedApi<CreatedEntity>(page, `/tenants/${tenantId}/plans`, 'POST', {
        planCode: `E2E-${suffix}`.slice(0, 50),
        planName: `E2E Storage Threshold ${suffix}`,
        maxStorageBytes: quotaBytes,
        maxFileSizeBytes: 1024,
        warningThresholdPercent: 80,
        softBlockThresholdPercent: 95,
        hardBlockThresholdPercent: 100,
        effectiveFromUtc: new Date().toISOString(),
        effectiveToUtc: null,
        isDefault: true,
      }),
      'Storage threshold plan creation',
    )

    tenantContext = await browser.newContext({
      baseURL: process.env.ERP_BASE_URL ?? 'http://127.0.0.1:5173',
    })
    const tenantPage = await tenantContext.newPage()
    let thresholdStatus = 1
    let usedPercent = 80
    await tenantPage.route(`**/api/tenants/${tenantId}/storage/summary`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tenantId,
          usedBytes: usedPercent,
          reservedBytes: 0,
          maxStorageBytes: 100,
          usedPercent,
          thresholdStatus,
          lastCalculatedAtUtc: new Date().toISOString(),
          planCode: `E2E-${suffix}`,
          planName: `E2E Storage Threshold ${suffix}`,
        }),
      })
    })

    const loginPage = new LoginPageObject(tenantPage)
    await loginPage.goto()
    await loginPage.login(tenantCode, tenantUsername, tenantPassword)
    await expect(tenantPage).not.toHaveURL(/\/login/, { timeout: 10_000 })

    await expect(tenantPage.getByText('Warning', { exact: true })).toBeVisible()
    await expect(tenantPage.getByText('80% used', { exact: true })).toBeVisible()

    thresholdStatus = 2
    usedPercent = 95
    await tenantPage.reload({ waitUntil: 'domcontentloaded' })
    await expect(tenantPage.getByText('Soft block', { exact: true })).toBeVisible()
    await expect(tenantPage.getByText('95% used', { exact: true })).toBeVisible()

    thresholdStatus = 3
    usedPercent = 100
    await tenantPage.reload({ waitUntil: 'domcontentloaded' })
    await expect(tenantPage.getByText('Hard block', { exact: true })).toBeVisible()
    await expect(tenantPage.getByText('100% used', { exact: true })).toBeVisible()

    await tenantPage.unroute(`**/api/tenants/${tenantId}/storage/summary`)

    const categoryId = expectSuccessfulFixture(
      await authenticatedApi<CreatedEntity>(tenantPage, '/project-categories', 'POST', {
        code: categoryCode,
        name: `E2E Storage Threshold ${suffix}`,
        description: 'Temporary category for storage threshold E2E coverage.',
      }),
      'Project category creation',
    ).id

    const projectId = expectSuccessfulFixture(
      await authenticatedApi<CreatedEntity>(tenantPage, '/projects', 'POST', {
        projectCategoryId: categoryId,
        projectNumber,
        name: projectName,
        governmentAgency: null,
        submissionReference: null,
        startDate: today,
        endDate: null,
        status: 1,
        notes: 'Temporary project for storage threshold E2E coverage.',
      }),
      'Project creation',
    ).id

    await tenantPage.goto(`/projects/${projectId}`)
    await expect(tenantPage.getByText(projectName, { exact: true })).toBeVisible()
    await tenantPage.getByRole('button', { name: /^documents$/i }).click()
    await tenantPage.getByRole('button', { name: /upload document/i }).click()

    const uploadDialog = tenantPage.getByRole('dialog')
    await uploadDialog.getByLabel(/^title$/i).fill(`Over-quota document ${suffix}`)
    await uploadDialog.locator('input[type="file"]').setInputFiles({
      name: `over-quota-${suffix}.pdf`,
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(quotaBytes + 1, 'x'),
    })

    const quotaResponsePromise = tenantPage.waitForResponse((response) => (
      response.request().method() === 'POST'
      && response.url().endsWith(`/api/projects/${projectId}/documents/upload`)
    ))
    await uploadDialog.getByRole('button', { name: /upload document/i }).click()
    const quotaResponse = await quotaResponsePromise

    expect(quotaResponse.status()).toBe(507)
    await expect(tenantPage.getByText('Uploading this file would exceed your storage quota of 64 bytes.')).toBeVisible()
  } finally {
    await tenantContext?.close().catch(() => undefined)
    if (!page.isClosed() && tenantId) {
      await authenticatedApi(page, `/tenants/${tenantId}`, 'DELETE')
    }
  }
})
