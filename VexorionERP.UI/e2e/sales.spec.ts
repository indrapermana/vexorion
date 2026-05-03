/**
 * sales.spec.ts — TC-M-020 to TC-M-026 (Sales cycle: SO, Invoice, Shipment)
 */
import { test, expect } from './fixtures'
import { GenericCrudPage } from './fixtures'

test.describe('Sales Orders', () => {
  test('TC-M-020: sales orders list page loads', async ({ page }) => {
    await page.goto('/sales-orders')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/sales-orders')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('TC-M-021: sales orders shows table or empty state', async ({ page }) => {
    await page.goto('/sales-orders')
    await page.waitForLoadState('networkidle')
    const table = page.locator('table, [role="grid"], [role="table"]')
    const empty = page.getByText(/no (sales orders|data|records)|empty/i)
    await expect(table.or(empty)).toBeVisible({ timeout: 8_000 })
  })

  test('TC-M-022: create sales order — dialog/form opens', async ({ page }) => {
    const crud = new GenericCrudPage(page, '/sales-orders')
    await crud.goto()
    await crud.clickAdd()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await crud.closeDialog()
  })
})

test.describe('Sales Invoices', () => {
  test('TC-M-023: sales invoices list page loads', async ({ page }) => {
    await page.goto('/sales-invoices')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/sales-invoices')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('TC-M-024: sales invoices shows table or empty state', async ({ page }) => {
    await page.goto('/sales-invoices')
    await page.waitForLoadState('networkidle')
    const table = page.locator('table, [role="grid"], [role="table"]')
    const empty = page.getByText(/no (invoices|data|records)|empty/i)
    await expect(table.or(empty)).toBeVisible({ timeout: 8_000 })
  })
})

test.describe('Sales Shipments', () => {
  test('TC-M-025: sales shipments list page loads', async ({ page }) => {
    await page.goto('/sales-shipments')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/sales-shipments')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })
})

test.describe('Customer Payments', () => {
  test('TC-M-026: customer payments list page loads', async ({ page }) => {
    await page.goto('/customer-payments')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/customer-payments')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })
})
