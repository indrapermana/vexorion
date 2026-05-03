/**
 * purchasing.spec.ts — TC-M-027 to TC-M-032 (Purchase cycle: PO, Receipt, Invoice, Vendor Payment)
 */
import { test, expect } from './fixtures'
import { GenericCrudPage } from './fixtures'

test.describe('Purchase Orders', () => {
  test('TC-M-027: purchase orders list page loads', async ({ page }) => {
    await page.goto('/purchase-orders')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/purchase-orders')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('TC-M-028: purchase orders shows table or empty state', async ({ page }) => {
    await page.goto('/purchase-orders')
    await page.waitForLoadState('networkidle')
    const table = page.locator('table, [role="grid"], [role="table"]')
    const empty = page.getByText(/no (purchase orders|data|records)|empty/i)
    await expect(table.or(empty)).toBeVisible({ timeout: 8_000 })
  })

  test('TC-M-029: create purchase order — dialog/form opens', async ({ page }) => {
    const crud = new GenericCrudPage(page, '/purchase-orders')
    await crud.goto()
    await crud.clickAdd()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await crud.closeDialog()
  })
})

test.describe('Purchase Receipts', () => {
  test('TC-M-030: purchase receipts list page loads', async ({ page }) => {
    await page.goto('/purchase-receipts')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/purchase-receipts')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })
})

test.describe('Purchase Invoices', () => {
  test('TC-M-031: purchase invoices list page loads', async ({ page }) => {
    await page.goto('/purchase-invoices')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/purchase-invoices')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })
})

test.describe('Suppliers', () => {
  test('TC-M-032: suppliers list page loads', async ({ page }) => {
    await page.goto('/suppliers')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/suppliers')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })
})

test.describe('Vendor Payments', () => {
  test('TC-M-033: vendor payments list page loads', async ({ page }) => {
    await page.goto('/vendor-payments')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/vendor-payments')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })
})
