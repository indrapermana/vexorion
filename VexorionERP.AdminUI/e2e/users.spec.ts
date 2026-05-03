/**
 * users.spec.ts — TC-A-013 to TC-A-019 (AdminUI User Management)
 */
import { test, expect } from './fixtures'

test.describe('Users Page', () => {
  test('TC-A-013: users page loads', async ({ page }) => {
    await page.goto('/users')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL('/users')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('TC-A-014: users page shows table or empty state', async ({ page }) => {
    await page.goto('/users')
    await page.waitForLoadState('networkidle')
    const table = page.locator('table, [role="grid"], [role="table"]')
    const empty = page.getByText(/no users|no data|empty/i)
    await expect(table.or(empty)).toBeVisible({ timeout: 8_000 })
  })

  test('TC-A-015: filter users by tenant', async ({ page }) => {
    await page.goto('/users')
    await page.waitForLoadState('networkidle')
    // Look for a tenant filter dropdown
    const tenantFilter = page.getByLabel(/tenant/i).first()
    if (await tenantFilter.isVisible()) {
      await tenantFilter.click()
      // Select first option in the dropdown
      const option = page.getByRole('option').first()
      if (await option.isVisible()) {
        await option.click()
        // List should reload
        await page.waitForLoadState('networkidle')
        await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
      }
    } else {
      test.skip(true, 'No tenant filter on users page')
    }
  })

  test('TC-A-016: create user dialog opens', async ({ page }) => {
    await page.goto('/users')
    await page.waitForLoadState('networkidle')
    const addBtn = page.getByRole('button', { name: /add|new|create/i }).first()
    if (await addBtn.isVisible()) {
      await addBtn.click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible({ timeout: 5_000 })
      await page.getByRole('button', { name: /cancel|close/i }).first().click()
    } else {
      test.skip(true, 'No add user button visible')
    }
  })

  test('TC-A-017: create user — empty form validation', async ({ page }) => {
    await page.goto('/users')
    await page.waitForLoadState('networkidle')
    const addBtn = page.getByRole('button', { name: /add|new|create/i }).first()
    if (!(await addBtn.isVisible())) {
      test.skip(true, 'No add user button visible')
    }
    await addBtn.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    for (const box of await dialog.getByRole('textbox').all()) {
      await box.clear()
    }
    await dialog.getByRole('button', { name: /save|create|add/i }).last().click()
    // Dialog stays open due to validation
    await expect(dialog).toBeVisible({ timeout: 3_000 })
    await page.getByRole('button', { name: /cancel|close/i }).first().click()
  })
})

test.describe('AdminUI Dashboard', () => {
  test('TC-A-018: admin dashboard loads', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Menu Configuration', () => {
  test('TC-A-019: menu configuration page loads', async ({ page }) => {
    await page.goto('/menu-config')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })
})
