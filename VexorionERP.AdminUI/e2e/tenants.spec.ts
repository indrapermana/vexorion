/**
 * tenants.spec.ts — TC-A-005 to TC-A-012 (Tenant Management CRUD)
 */
import { AUTH_CREDENTIALS, test, expect, uid } from './fixtures'

const UNIQUE_NAME = () => uid('E2E Tenant')
const UNIQUE_CODE = () => `${AUTH_CREDENTIALS.tenantCode}-child-${uid('t').slice(-12)}`.slice(0, 50)

test.describe('Tenant List', () => {
  test('TC-A-005: tenant list page loads', async ({ page, tenantsPage }) => {
    await tenantsPage.goto()
    await expect(page).toHaveURL('/tenants')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('TC-A-006: tenant list shows active count', async ({ page, tenantsPage }) => {
    await tenantsPage.goto()
    // Some numeric summary of tenants should be visible
    await expect(page.locator('text=/\\d+/')).toBeVisible({ timeout: 5_000 })
  })

  test('TC-A-007: tenant list shows table or empty state', async ({ page, tenantsPage }) => {
    await tenantsPage.goto()
    const table = page.locator('table, [role="grid"], [role="table"]')
    const empty = page.getByText(/no tenants|no data|empty/i)
    await expect(table.or(empty)).toBeVisible({ timeout: 8_000 })
  })
})

test.describe('Tenant Create', () => {
  test('TC-A-008: create tenant dialog opens', async ({ page, tenantsPage }) => {
    await tenantsPage.goto()
    await tenantsPage.clickAdd()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await tenantsPage.closeDialog()
  })

  test('TC-A-009: create tenant with valid data', async ({ page, tenantsPage }) => {
    await tenantsPage.goto()
    await tenantsPage.clickAdd()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const name = UNIQUE_NAME()
    const code = UNIQUE_CODE()
    await tenantsPage.fillTenantForm(name, code)
    await tenantsPage.saveDialog()

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })
    // New tenant appears in list
    await expect(page.getByText(name)).toBeVisible({ timeout: 5_000 })
  })

  test('TC-A-010: create tenant — empty name shows validation', async ({ page, tenantsPage }) => {
    await tenantsPage.goto()
    await tenantsPage.clickAdd()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Clear all text inputs and submit
    for (const box of await dialog.getByRole('textbox').all()) {
      await box.clear()
    }
    await tenantsPage.saveDialog()

    // Dialog should stay open
    await expect(dialog).toBeVisible({ timeout: 3_000 })
    await tenantsPage.closeDialog()
  })
})

test.describe('Tenant Edit', () => {
  test('TC-A-011: edit tenant dialog opens', async ({ page, tenantsPage }) => {
    await tenantsPage.goto()
    // Find first edit button in the table
    const editBtn = page.getByRole('button', { name: /edit/i }).first()
    if (await editBtn.isVisible()) {
      await editBtn.click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible({ timeout: 5_000 })
      await tenantsPage.closeDialog()
    } else {
      test.skip(true, 'No existing tenants to edit')
    }
  })
})

test.describe('Tenant Delete', () => {
  test('TC-A-012: delete confirmation dialog appears', async ({ page, tenantsPage }) => {
    await tenantsPage.goto()
    const deleteBtn = page.getByRole('button', { name: /delete|remove/i }).first()
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click()
      // A confirmation dialog should appear
      const confirm = page.getByRole('dialog')
      await expect(confirm).toBeVisible({ timeout: 5_000 })
      // Cancel to avoid actually deleting
      await page.getByRole('button', { name: /cancel|no/i }).first().click()
    } else {
      test.skip(true, 'No tenants available to delete')
    }
  })
})
