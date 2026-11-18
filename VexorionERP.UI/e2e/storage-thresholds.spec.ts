/**
 * Storage threshold E2E coverage.
 *
 * Threshold summaries are isolated at the browser boundary so each dashboard
 * state is deterministic. The hard quota path remains a real API request and
 * must reject before the disabled development Blob Storage account is called.
 */
import { AUTH_CREDENTIALS, expect, test, uid } from './fixtures'
import { authenticatedApi, expectSuccessfulFixture, type CreatedEntity } from './api-helpers'

type OnboardTenantResponse = {
  tenantId: string
}

type CurrentUserResponse = {
  id: string
  tenantId: string
  userName: string
  email: string
  roles: string[]
  permissions: string[]
}

test('P1-1: show storage thresholds and reject uploads beyond the hard quota', async ({ page, browser, request }) => {
  test.setTimeout(90_000)

  const suffix = uid('storage')
  const tenantCode = `${AUTH_CREDENTIALS.tenantCode}-storage-${suffix.slice(-8)}`.slice(0, 50)
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

    const apiBaseUrl = process.env.E2E_API_BASE_URL?.replace(/\/$/u, '')
    if (!apiBaseUrl) throw new Error('E2E_API_BASE_URL is required for storage threshold coverage.')
    const loginResponse = await request.post(`${apiBaseUrl}/auth/login`, {
      data: {
        tenantCode,
        userNameOrEmail: tenantUsername,
        password: tenantPassword,
      },
    })
    const loginResponseText = await loginResponse.text()
    expect(loginResponse.status(), loginResponseText).toBe(200)
    const tenantSession = JSON.parse(loginResponseText) as { accessToken?: string }
    expect(tenantSession.accessToken, loginResponseText).toBeTruthy()

    // Verify the newly provisioned tenant session directly, then isolate the
    // browser bootstrap from remote auth timing. Authentication itself has
    // dedicated E2E coverage; this scenario is concerned with storage states.
    const currentUserResponse = await request.get(`${apiBaseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${tenantSession.accessToken}` },
    })
    const currentUserResponseText = await currentUserResponse.text()
    expect(currentUserResponse.status(), currentUserResponseText).toBe(200)
    const currentUser = JSON.parse(currentUserResponseText) as CurrentUserResponse
    expect(currentUser.tenantId).toBe(tenantId)

    const tenantApiPost = async <T>(path: string, body: unknown, operation: string): Promise<T> => {
      const response = await request.post(`${apiBaseUrl}${path}`, {
        headers: { Authorization: `Bearer ${tenantSession.accessToken}` },
        data: body,
      })
      const responseText = await response.text()
      expect(response.status(), `${operation} failed: ${responseText}`).toBeGreaterThanOrEqual(200)
      expect(response.status(), `${operation} failed: ${responseText}`).toBeLessThan(300)
      return JSON.parse(responseText) as T
    }

    tenantContext = await browser.newContext({
      baseURL: process.env.ERP_BASE_URL ?? 'http://127.0.0.1:5173',
    })
    await tenantContext.addInitScript((session) => {
      window.localStorage.setItem('vexorionerp.auth', JSON.stringify({ state: { session }, version: 0 }))
    }, tenantSession)
    await tenantContext.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(currentUser),
      })
    })

    let thresholdStatus = 1
    let usedPercent = 80
    const storageSummaryRoute = '**/api/tenants/*/storage/summary**'
    await tenantContext.route(storageSummaryRoute, async (route) => {
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

    const tenantPage = await tenantContext.newPage()
    const initialSummary = tenantPage.waitForResponse((response) => response.url().includes('/storage/summary'))
    await tenantPage.goto('/')
    const initialSummaryResponse = await initialSummary
    await expect(tenantPage).not.toHaveURL(/\/login/)
    expect(initialSummaryResponse.url()).toContain(`/tenants/${tenantId}/storage/summary`)
    await expect(initialSummaryResponse.json()).resolves.toMatchObject({ usedPercent: 80, thresholdStatus: 1 })

    await expect(tenantPage.getByText('Near limit', { exact: true })).toBeVisible()
    await expect(tenantPage.getByText('80% used', { exact: true })).toBeVisible()

    thresholdStatus = 2
    usedPercent = 95
    await tenantPage.reload({ waitUntil: 'domcontentloaded' })
    await expect(tenantPage.getByText('Upload restriction', { exact: true })).toBeVisible()
    await expect(tenantPage.getByText('95% used', { exact: true })).toBeVisible()

    thresholdStatus = 3
    usedPercent = 100
    await tenantPage.reload({ waitUntil: 'domcontentloaded' })
    await expect(tenantPage.getByText('Uploads blocked', { exact: true })).toBeVisible()
    await expect(tenantPage.getByText('100% used', { exact: true })).toBeVisible()

    await tenantContext.unroute(storageSummaryRoute)

    const category = await tenantApiPost<CreatedEntity>(
      '/project-categories',
      {
        code: categoryCode,
        name: `E2E Storage Threshold ${suffix}`,
        description: 'Temporary category for storage threshold E2E coverage.',
      },
      'Project category creation',
    )

    const project = await tenantApiPost<CreatedEntity>(
      '/projects',
      {
        projectCategoryId: category.id,
        projectNumber,
        name: projectName,
        governmentAgency: null,
        submissionReference: null,
        startDate: today,
        endDate: null,
        status: 1,
        notes: 'Temporary project for storage threshold E2E coverage.',
      },
      'Project creation',
    )

    await tenantPage.goto(`/projects/${project.id}`)
    await expect(tenantPage.getByText(projectName, { exact: true })).toBeVisible()
    await tenantPage.getByRole('tab', { name: /^documents$/i }).click()
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
      && response.url().endsWith(`/api/projects/${project.id}/documents/upload`)
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
