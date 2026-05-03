/**
 * inventory.spec.ts — TC-M-034 to TC-M-040 (Inventory: products, warehouses, adjustments, stock counts, stock transfers)
 */
import { test, expect } from './fixtures'

test.describe('Warehouses', () => {
  test('TC-M-034: warehouses list page loads', async ({ page }) => {
    await page.goto('/warehouses')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/warehouses')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('TC-M-035: warehouses shows table or empty state', async ({ page }) => {
    await page.goto('/warehouses')
    await page.waitForLoadState('networkidle')
    const table = page.locator('table, [role="grid"], [role="table"]')
    const empty = page.getByText(/no (warehouses|data|records)|empty/i)
    await expect(table.or(empty)).toBeVisible({ timeout: 8_000 })
  })
})

test.describe('Inventory Adjustments', () => {
  test('TC-M-036: inventory adjustments page loads', async ({ page }) => {
    await page.goto('/inventory-adjustments')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/inventory-adjustments')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })
})

test.describe('Stock Counts', () => {
  test('TC-M-037: stock counts page loads', async ({ page }) => {
    await page.goto('/stock-counts')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/stock-counts')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })
})

test.describe('Stock Transfers', () => {
  test('TC-M-038: stock transfers page loads', async ({ page }) => {
    await page.goto('/stock-transfers')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/stock-transfers')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })
})
