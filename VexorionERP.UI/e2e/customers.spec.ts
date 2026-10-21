/**
 * customers.spec.ts — TC-M-012 to TC-M-015 (Customer CRUD)
 */
import { test, expect, GenericCrudPage, uid } from './fixtures'

const UNIQUE = () => uid('E2E')

test.describe('Customers', () => {
  test('TC-M-012: customers list page loads', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/customers')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('TC-M-013: create customer — open dialog and save', async ({ page }) => {
    const crud = new GenericCrudPage(page, '/customers')
    await crud.goto()
    await crud.clickAdd()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    const name = UNIQUE()
    // Fill the name field (first text input in dialog)
    await dialog.getByRole('textbox').first().fill(name)

    await crud.saveDialog()
    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 8_000 })
    // New customer should appear in the list
    await expect(page.getByText(name)).toBeVisible({ timeout: 5_000 })
  })

  test('TC-M-014: create customer — required name validation', async ({ page }) => {
    const crud = new GenericCrudPage(page, '/customers')
    await crud.goto()
    await crud.clickAdd()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Clear all textboxes and try to save
    for (const box of await dialog.getByRole('textbox').all()) {
      await box.clear()
    }
    await crud.saveDialog()

    // Dialog stays open with error
    await expect(dialog).toBeVisible({ timeout: 3_000 })
  })

  test('TC-M-015: customers page shows data table or empty state', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')
    // Either a table/grid or an empty-state message must exist
    const table = page.locator('table, [role="grid"], [role="table"]')
    const empty = page.getByText(/no customers|no data|empty/i)
    await expect(table.or(empty)).toBeVisible({ timeout: 8_000 })
  })
})
