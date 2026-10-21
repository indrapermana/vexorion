/**
 * config.spec.ts — TC-M-048 to TC-M-058 (Configuration sub-pages)
 */
import { test, expect, GenericCrudPage, uid } from './fixtures'

test.describe('Config — Company', () => {
  test('TC-M-048: company settings page loads', async ({ page }) => {
    await page.goto('/config/company')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/config/company')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('TC-M-049: company form fields are visible', async ({ page }) => {
    await page.goto('/config/company')
    await page.waitForLoadState('networkidle')
    // At least one text input or form element present
    const input = page.getByRole('textbox').first()
    await expect(input).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('Config — Users', () => {
  test('TC-M-050: config users page loads', async ({ page }) => {
    await page.goto('/config/users')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/config/users')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('TC-M-051: create user dialog opens', async ({ page }) => {
    const crud = new GenericCrudPage(page, '/config/users')
    await crud.goto()
    await crud.clickAdd()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await crud.closeDialog()
  })
})

test.describe('Config — Roles', () => {
  test('TC-M-052: config roles page loads', async ({ page }) => {
    await page.goto('/config/roles')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/config/roles')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })
})

test.describe('Config — Menu', () => {
  test('TC-M-053: config menu page loads', async ({ page }) => {
    await page.goto('/config/menu')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/config/menu')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })
})

test.describe('Config — Tax & Discount', () => {
  test('TC-M-054: tax & discount page loads', async ({ page }) => {
    await page.goto('/config/tax-discount')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/config/tax-discount')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })
})

test.describe('Config — Product Categories', () => {
  test('TC-M-055: product categories config page loads', async ({ page }) => {
    await page.goto('/config/product-categories')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/config/product-categories')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('TC-M-056: create product category', async ({ page }) => {
    const crud = new GenericCrudPage(page, '/config/product-categories')
    await crud.goto()
    await crud.clickAdd()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    const name = uid('E2E-CAT')
    await dialog.getByRole('textbox').first().fill(name)
    await crud.saveDialog()
    await expect(dialog).not.toBeVisible({ timeout: 8_000 })
  })
})
