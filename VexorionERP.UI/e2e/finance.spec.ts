/**
 * finance.spec.ts — TC-M-041 to TC-M-048 (Finance: accounts, journals, fiscal periods, reports, audit logs)
 */
import { test, expect } from './fixtures'

test.describe('Accounts (Chart of Accounts)', () => {
  test('TC-M-041: accounts page loads', async ({ page }) => {
    await page.goto('/accounts')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/accounts')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('TC-M-042: accounts shows table or empty state', async ({ page }) => {
    await page.goto('/accounts')
    await page.waitForLoadState('networkidle')
    const table = page.locator('table, [role="grid"], [role="table"]')
    const empty = page.getByText(/no (accounts|data|records)|empty/i)
    await expect(table.or(empty)).toBeVisible({ timeout: 8_000 })
  })
})

test.describe('Journals', () => {
  test('TC-M-043: journals page loads', async ({ page }) => {
    await page.goto('/journals')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/journals')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })
})

test.describe('Fiscal Periods', () => {
  test('TC-M-044: fiscal periods page loads', async ({ page }) => {
    await page.goto('/fiscal-periods')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/fiscal-periods')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })
})

test.describe('Reports', () => {
  test('TC-M-045: reports page loads', async ({ page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/reports')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })
})

test.describe('Audit Logs', () => {
  test('TC-M-046: audit logs page loads', async ({ page }) => {
    await page.goto('/audit-logs')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/audit-logs')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('TC-M-047: audit logs shows table or empty state', async ({ page }) => {
    await page.goto('/audit-logs')
    await page.waitForLoadState('networkidle')
    const table = page.locator('table, [role="grid"], [role="table"]')
    const empty = page.getByText(/no (logs|data|records)|empty/i)
    await expect(table.or(empty)).toBeVisible({ timeout: 8_000 })
  })
})
