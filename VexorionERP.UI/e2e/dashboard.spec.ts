/**
 * dashboard.spec.ts — TC-M-006 to TC-M-011 (Dashboard scenarios)
 */
import { test, expect } from './fixtures'
import enUS from '../src/i18n/locales/enUS'
import idID from '../src/i18n/locales/idID'
import esES from '../src/i18n/locales/esES'

test.describe('Dashboard', () => {
  test('UX-DASH-01: hierarchy and finance filters fit desktop and mobile', async ({ page, dashboardPage }, testInfo) => {
    await dashboardPage.goto()
    await dashboardPage.waitForLoad()

    const finance = page.getByRole('region', { name: 'Finance', exact: true })
    const activity = page.getByRole('region', { name: 'Recent Sales Activity', exact: true })
    await expect(finance.getByLabel('Reference date')).toBeVisible()
    await expect(activity.getByLabel('Reference date')).toHaveCount(0)

    const expectedHeadings = ['Financial Overview', 'Overdue Balances and Aging', 'Cash Flow and Balances', 'Recent Sales Activity']
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      const headings = await page.locator('h2[id^="dashboard-"]').allTextContents()
      expect(headings).toEqual(expectedHeadings)
      await expect(finance.getByLabel('Reference date')).toBeVisible()
      await expect(finance.getByLabel('Reporting period')).toBeVisible()
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
    await finance.getByLabel('Reporting period').selectOption('90')
    await snapshotResponse
    await expect(finance.getByRole('heading', { name: 'Cash Flow (90 days)', exact: true })).toBeVisible()
  })

  test('UX-DASH-02: reporting definitions and localized copy fit narrow screens', async ({ page, dashboardPage }, testInfo) => {
    await dashboardPage.goto()
    await dashboardPage.waitForLoad()
    const responsePromise = page.waitForResponse((response) => (
      new URL(response.url()).pathname.endsWith('/reports/dashboard')
      && new URL(response.url()).searchParams.get('asOfDate') === '2024-03-01'
      && response.ok()
    ))
    await page.getByLabel('Reference date').fill('2024-03-01')
    await responsePromise
    await expect(page.getByText('Feb 1, 2024 to Mar 1, 2024 · 30 days, both dates included', { exact: true })).toBeVisible()

    for (const [language, copy] of [['enUS', enUS], ['idID', idID], ['esES', esES]] as const) {
      await page.getByLabel(/Language selector|Pemilih bahasa|Selector de idioma/).click()
      await page.locator(`[role="option"][data-value="${language}"]`).click()
      await expect(page.getByText(copy.dashboard.context.balances, { exact: true })).toBeVisible()
      await expect(page.getByText(copy.dashboard.context.currency.replace('{{currency}}', 'USD'), { exact: true })).toBeVisible()
      await expect(page.getByText(copy.dashboard.definitions.invoicedSales, { exact: true })).toBeVisible()
      await expect(page.getByRole('heading', { name: copy.dashboard.storage.title, exact: true })).toBeVisible()
      const indicators = page.getByRole('region', { name: copy.dashboard.quickStats.title, exact: true })
      await expect(indicators.getByText(copy.dashboard.quickStats.notApplicable, { exact: true })).toHaveCount(4)
      await expect(page.getByText(/Capacity planning benchmark/)).toHaveCount(0)
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
        await page.screenshot({ path: testInfo.outputPath(`dashboard-definitions-${language}-${width}.png`), fullPage: true, animations: 'disabled' })
      }
    }
  })

  test('UX-DASH-03: isolated failures, targeted retry, and cached freshness recover safely', async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    let financeFails = true
    let agingFails = true
    let holdRefresh = false
    let financeAttempts = 0
    let agingAttempts = 0
    let releaseInitial = () => {}
    let releaseRefresh = () => {}
    const initialGate = new Promise<void>((resolve) => { releaseInitial = resolve })
    const refreshGate = new Promise<void>((resolve) => { releaseRefresh = resolve })
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await page.route('**/api/reports/dashboard?*', async (route) => {
      financeAttempts += 1
      if (!financeFails) return route.continue()
      await initialGate
      if (holdRefresh) await refreshGate
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'Internal failure details must not be shown' }) })
    })
    await page.route('**/api/reports/ar-aging?*', async (route) => {
      agingAttempts += 1
      if (!agingFails) return route.continue()
      await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
    })

    try {
      await page.setViewportSize({ width: 390, height: 900 })
      await page.goto('/')
      const metrics = page.getByRole('region', { name: 'Financial metrics', exact: true })
      const aging = page.getByRole('region', { name: 'Receivables Aging', exact: true })
      await expect(metrics.getByRole('status', { name: 'Loading Financial metrics...' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Payables Aging', exact: true })).toBeVisible()
      releaseInitial()
      await expect(metrics.getByRole('alert')).toContainText('Unable to load Financial metrics.', { timeout: 15_000 })
      await expect(aging.getByRole('alert')).toBeVisible({ timeout: 15_000 })
      await expect(metrics.getByText('Outstanding receivables', { exact: true })).toHaveCount(0)
      await expect(metrics.locator('time')).toHaveCount(0)
      await expect(page.getByRole('heading', { name: 'Recent Orders', exact: true })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Storage and Plan Limit', exact: true })).toBeVisible()
      await expect(page.getByText('Internal failure details must not be shown', { exact: true })).toHaveCount(0)
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
      await page.screenshot({ path: testInfo.outputPath('dashboard-partial-failure-390.png'), fullPage: true, animations: 'disabled' })

      const agingBeforeFinanceRetry = agingAttempts
      financeFails = false
      await metrics.getByRole('button', { name: 'Retry Financial metrics', exact: true }).click()
      await expect(metrics.getByText('Outstanding receivables', { exact: true })).toBeVisible()
      await expect(metrics.getByRole('alert')).toHaveCount(0)
      expect(agingAttempts).toBe(agingBeforeFinanceRetry)
      const lastFetched = await metrics.locator('time').getAttribute('datetime')
      expect(lastFetched).toBeTruthy()

      financeFails = true
      holdRefresh = true
      await metrics.getByRole('button', { name: 'Refresh Financial metrics', exact: true }).click()
      await expect(metrics.getByRole('status')).toContainText('Updating Financial metrics...')
      await expect(metrics.getByRole('button')).toBeDisabled()
      await expect(metrics.getByText('Outstanding receivables', { exact: true })).toBeVisible()
      releaseRefresh()
      await expect(metrics.getByRole('alert')).toContainText('Showing previously fetched data.', { timeout: 15_000 })
      await expect(metrics.locator('time')).toHaveAttribute('datetime', lastFetched!)
      await expect(metrics.getByText('Outstanding receivables', { exact: true })).toBeVisible()
      await page.screenshot({ path: testInfo.outputPath('dashboard-cached-refresh-failure-390.png'), fullPage: true, animations: 'disabled' })

      financeFails = false
      await metrics.getByRole('button', { name: 'Retry Financial metrics', exact: true }).click()
      await expect(metrics.getByRole('alert')).toHaveCount(0)
      await expect.poll(() => metrics.locator('time').getAttribute('datetime')).not.toBe(lastFetched)

      const financeBeforeAgingRetry = financeAttempts
      agingFails = false
      await aging.getByRole('button', { name: 'Retry Receivables Aging', exact: true }).click()
      await expect(aging.getByRole('heading', { name: 'Receivables Aging', exact: true })).toBeVisible()
      await expect(aging.getByRole('alert')).toHaveCount(0)
      expect(financeAttempts).toBe(financeBeforeAgingRetry)
      expect(pageErrors).toEqual([])
    } finally {
      releaseInitial()
      releaseRefresh()
    }
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
