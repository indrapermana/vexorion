/**
 * products.spec.ts — TC-M-016 to TC-M-019 (Product CRUD)
 */
import { test, expect } from './fixtures'
import { GenericCrudPage } from './fixtures'

const UNIQUE = () => `E2E-PROD-${Date.now()}`

test.describe('Products', () => {
  test('TC-M-016: products list page loads', async ({ page }) => {
    await page.goto('/products')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/products')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('TC-M-017: products page shows table or empty state', async ({ page }) => {
    await page.goto('/products')
    await page.waitForLoadState('networkidle')
    const table = page.locator('table, [role="grid"], [role="table"]')
    const empty = page.getByText(/no products|no data|empty/i)
    await expect(table.or(empty)).toBeVisible({ timeout: 8_000 })
  })

  test('TC-M-018: create product — dialog opens', async ({ page }) => {
    const crud = new GenericCrudPage(page, '/products')
    await crud.goto()
    await crud.clickAdd()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await crud.closeDialog()
  })

  test('TC-M-019: create product — save with name and SKU', async ({ page }) => {
    const crud = new GenericCrudPage(page, '/products')
    await crud.goto()
    await crud.clickAdd()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const name = UNIQUE()
    const sku = `SKU-${Date.now()}`

    // Fill name — first textbox
    await dialog.getByRole('textbox').nth(0).fill(name)
    // Fill SKU — look for SKU-labelled field or second textbox
    const skuField = dialog.getByLabel(/sku|code/i).first()
    if (await skuField.isVisible()) {
      await skuField.fill(sku)
    } else {
      await dialog.getByRole('textbox').nth(1).fill(sku)
    }

    await crud.saveDialog()
    await expect(dialog).not.toBeVisible({ timeout: 8_000 })
  })
})
