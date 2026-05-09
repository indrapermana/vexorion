/**
 * permissions.spec.ts
 *
 * Permission and security E2E tests:
 *  - Unauthenticated API calls return 401
 *  - Direct navigation without auth redirects to /login
 *  - Config pages (Users, Roles) accessible to admin
 *  - Audit log accessible to admin
 *
 * Covers TEST_PLAN: 4.1.1, 4.1.2, 4.1.3, 4.1.4
 */
import { test, expect } from './fixtures'
import { request } from '@playwright/test'

// ---------------------------------------------------------------------------
// TC-4.1.1 — Unauthenticated API → 401
// ---------------------------------------------------------------------------

test('TC-4.1.1: unauthenticated API call returns 401', async () => {
  // Make a direct API call without auth cookies/token
  const apiContext = await request.newContext({ baseURL: process.env.API_BASE_URL ?? 'http://localhost:5000' })
  const response = await apiContext.get('/api/customers', {
    headers: { 'X-Tenant-Code': 'demo' },
  })
  // Should return 401 Unauthorized
  expect(response.status()).toBe(401)
  await apiContext.dispose()
})

// ---------------------------------------------------------------------------
// TC-4.1.2 — Unauthenticated navigation redirects to /login
// ---------------------------------------------------------------------------

test('TC-4.1.2: navigating to protected route without auth redirects to login', async ({ browser }) => {
  // Fresh context — no stored auth
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto('/customers')
  await page.waitForLoadState('networkidle')

  // Should redirect to login
  expect(page.url()).toContain('/login')
  await context.close()
})

// ---------------------------------------------------------------------------
// TC-4.1.3 — Admin can access config pages
// ---------------------------------------------------------------------------

test('TC-4.1.3: admin can access config users page', async ({ page }) => {
  await page.goto('/config/users')
  await page.waitForLoadState('networkidle')

  // Should NOT be redirected to login
  expect(page.url()).not.toContain('/login')

  // Users table or empty state visible
  const grid = page.locator('table, [role="grid"]')
  const empty = page.getByText(/no data|no users|empty/i)
  await expect(grid.or(empty)).toBeVisible({ timeout: 5_000 })
})

test('TC-4.1.4: admin can access config roles page', async ({ page }) => {
  await page.goto('/config/roles')
  await page.waitForLoadState('networkidle')

  expect(page.url()).not.toContain('/login')

  const grid = page.locator('table, [role="grid"]')
  const empty = page.getByText(/no data|no roles|empty/i)
  await expect(grid.or(empty)).toBeVisible({ timeout: 5_000 })
})

// ---------------------------------------------------------------------------
// TC-4.1.5 — Admin can access audit logs
// ---------------------------------------------------------------------------

test('TC-4.1.5: admin can access audit logs', async ({ page }) => {
  await page.goto('/audit-logs')
  await page.waitForLoadState('networkidle')

  expect(page.url()).not.toContain('/login')

  const grid = page.locator('table, [role="grid"]')
  const empty = page.getByText(/no data|no audit|empty/i)
  await expect(grid.or(empty)).toBeVisible({ timeout: 5_000 })
})

// ---------------------------------------------------------------------------
// TC-4.1.6 — API responds 401 for cross-tenant request
// ---------------------------------------------------------------------------

test('TC-4.1.6: API call with wrong tenant header returns 401 or 403', async () => {
  const apiContext = await request.newContext({ baseURL: process.env.API_BASE_URL ?? 'http://localhost:5000' })
  const response = await apiContext.get('/api/customers', {
    headers: { 'X-Tenant-Code': 'nonexistent-tenant-xyz' },
  })
  expect([401, 403, 404]).toContain(response.status())
  await apiContext.dispose()
})
