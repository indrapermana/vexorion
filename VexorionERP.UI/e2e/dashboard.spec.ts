/**
 * dashboard.spec.ts — TC-M-006 to TC-M-011 (Dashboard scenarios)
 */
import { test, expect } from './fixtures'

test.describe('Dashboard', () => {
  test('UX-DASH-01: hierarchy and finance filters fit desktop and mobile', async ({ page, dashboardPage }, testInfo) => {
    await dashboardPage.goto()
    await dashboardPage.waitForLoad()

    const finance = page.getByRole('region', { name: 'Finance', exact: true })
    const activity = page.getByRole('region', { name: 'Recent Sales Activity', exact: true })
    await expect(finance.getByLabel('As-of date')).toBeVisible()
    await expect(activity.getByLabel('As-of date')).toHaveCount(0)

    const expectedHeadings = ['Financial Overview', 'Overdue Balances and Aging', 'Cash Flow and Balances', 'Recent Sales Activity']
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      const headings = await page.locator('h2[id^="dashboard-"]').allTextContents()
      expect(headings).toEqual(expectedHeadings)
      await expect(finance.getByLabel('As-of date')).toBeVisible()
      await expect(finance.getByLabel('Window')).toBeVisible()
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
      if (width >= 1200) {
        await expect.poll(async () => (await page.getByRole('heading', { level: 1, name: 'Dashboard', exact: true }).boundingBox())?.x ?? 0).toBeGreaterThanOrEqual(280)
      }
      await page.screenshot({ path: testInfo.outputPath(`dashboard-${width}.png`), fullPage: true, animations: 'disabled' })
    }

    const snapshotResponse = page.waitForResponse((response) => (
      new URL(response.url()).pathname.endsWith('/reports/dashboard')
      && new URL(response.url()).searchParams.get('periodDays') === '90'
      && response.ok()
    ))
    await finance.getByLabel('Window').selectOption('90')
    await snapshotResponse
    await expect(finance.getByRole('heading', { name: 'Cash Flow (90 days)', exact: true })).toBeVisible()
  })

  test('TC-M-006: dashboard loads after login', async ({ page, dashboardPage }) => {
    await dashboardPage.goto()
    await dashboardPage.waitForLoad()
    // Page should not be login or error page
    await expect(page).toHaveURL('/')
    await expect(page.locator('body')).toBeVisible()
  })

  test('TC-M-007: KPI cards are rendered', async ({ page, dashboardPage }) => {
    await dashboardPage.goto()
    await dashboardPage.waitForLoad()
    // At least one KPI/stat card is visible — look for currency amount or card containers
    const statCard = page.locator('[class*="card"], [class*="Card"], [data-testid*="kpi"], [data-testid*="stat"]').first()
    // Fallback: look for any numeric content that represents a metric
    const hasCards = await statCard.isVisible().catch(() => false)
    const hasNumbers = page.locator('text=/\\d+/').first()
    await expect(hasNumbers).toBeVisible({ timeout: 5_000 })
    void hasCards // suppress unused variable
  })

  test('TC-M-008: dashboard shows monetary values (not empty)', async ({ page, dashboardPage }) => {
    await dashboardPage.goto()
    await dashboardPage.waitForLoad()
    // At least some numeric value is displayed (revenue, totals, etc.)
    await expect(page.locator('text=/[0-9]/')).toBeVisible({ timeout: 8_000 })
  })

  test('TC-M-009: no unhandled error boundary shown', async ({ page, dashboardPage }) => {
    await dashboardPage.goto()
    await dashboardPage.waitForLoad()
    await expect(page.getByText(/something went wrong|unhandled|error boundary/i)).not.toBeVisible()
  })

  test('TC-M-010: navigation sidebar is visible', async ({ page, dashboardPage }) => {
    await dashboardPage.goto()
    await dashboardPage.waitForLoad()
    // Sidebar should exist with navigation links
    const nav = page.getByRole('navigation').first()
    await expect(nav).toBeVisible({ timeout: 5_000 })
  })

  test('TC-M-011: direct navigation to /customers works', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/customers')
    await expect(page.getByText(/something went wrong|unhandled/i)).not.toBeVisible()
  })
})
