/**
 * finance-workflow.spec.ts
 *
 * Finance workflows:
 *  - Chart of Accounts: create account, validation
 *  - Fiscal Periods: create period, view list
 *  - Journals: post sales invoice, post purchase invoice, reversal form
 *
 * Covers TEST_PLAN: 1.8.1.1, 1.8.1.2, 1.8.2.1, 1.8.3.1, 1.8.3.2, 1.8.4
 */
import { test, expect, uid, fillField } from './fixtures'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
async function openAddDialog(page: Parameters<typeof fillField>[0], buttonName: RegExp) {
  await page.getByRole('button', { name: buttonName }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible({ timeout: 5_000 })
  return dialog
}

// ---------------------------------------------------------------------------
// 1. Chart of Accounts
// ---------------------------------------------------------------------------

test.describe('Chart of Accounts Workflow', () => {
  test('TC-1.8.1.1: accounts list visible', async ({ page }) => {
    await page.goto('/accounts')
    await page.waitForLoadState('networkidle')
    const grid = page.locator('table, [role="grid"]')
    const empty = page.getByText(/no data|no accounts|empty/i)
    await expect(grid.or(empty)).toBeVisible({ timeout: 5_000 })
  })

  test('TC-1.8.1.2: create account', async ({ page }) => {
    await page.goto('/accounts')
    await page.waitForLoadState('networkidle')

    const dialog = await openAddDialog(page, /new account/i)

    await fillField(page, /^code$/i, uid('ACCT'))
    await fillField(page, /^name$/i, uid('E2E Account'))

    // Account type — select first option from dropdown
    const typeField = dialog.getByLabel(/account type/i).first()
    if (await typeField.isVisible()) {
      await typeField.click()
      const opt = page.getByRole('option').first()
      if (await opt.isVisible()) await opt.click()
    }

    await dialog.getByRole('button', { name: /create account/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })
  })

  test('TC-1.8.1.3: empty code shows validation', async ({ page }) => {
    await page.goto('/accounts')
    await page.waitForLoadState('networkidle')

    const dialog = await openAddDialog(page, /new account/i)
    await fillField(page, /^code$/i, '')
    await dialog.getByRole('button', { name: /create account/i }).click()

    await expect(dialog).toBeVisible({ timeout: 3_000 })
    await expect(dialog.getByText(/required/i)).toBeVisible()
    await dialog.getByRole('button', { name: /cancel/i }).click()
  })
})

// ---------------------------------------------------------------------------
// 2. Fiscal Periods
// ---------------------------------------------------------------------------

test.describe('Fiscal Periods Workflow', () => {
  test('TC-1.8.2.1: fiscal periods list visible', async ({ page }) => {
    await page.goto('/fiscal-periods')
    await page.waitForLoadState('networkidle')
    const grid = page.locator('table, [role="grid"]')
    const empty = page.getByText(/no data|no periods|empty/i)
    await expect(grid.or(empty)).toBeVisible({ timeout: 5_000 })
  })

  test('TC-1.8.2.2: create fiscal period', async ({ page }) => {
    await page.goto('/fiscal-periods')
    await page.waitForLoadState('networkidle')

    const dialog = await openAddDialog(page, /new period/i)

    await fillField(page, /period code/i, uid('P'))
    // Start date / End date
    await fillField(page, /start date/i, '2025-01-01')
    await fillField(page, /end date/i, '2025-03-31')

    await dialog.getByRole('button', { name: /create period/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })
  })

  test('TC-1.8.2.3: empty period code shows validation', async ({ page }) => {
    await page.goto('/fiscal-periods')
    await page.waitForLoadState('networkidle')

    const dialog = await openAddDialog(page, /new period/i)
    await fillField(page, /period code/i, '')
    await dialog.getByRole('button', { name: /create period/i }).click()

    await expect(dialog).toBeVisible({ timeout: 3_000 })
    await expect(dialog.getByText(/required/i)).toBeVisible()
    await dialog.getByRole('button', { name: /cancel/i }).click()
  })
})

// ---------------------------------------------------------------------------
// 3. Journals — Post Invoice
// ---------------------------------------------------------------------------

test.describe('Journals Workflow', () => {
  test('TC-1.8.3.1: journals page loads with posting sections', async ({ page }) => {
    await page.goto('/journals')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/post sales invoice/i)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/post purchase invoice/i)).toBeVisible()
  })

  test('TC-1.8.3.2: post sales invoice button disabled without required fields', async ({ page }) => {
    await page.goto('/journals')
    await page.waitForLoadState('networkidle')

    const postBtn = page.getByRole('button', { name: /post sales invoice/i })
    // Button is disabled when invoice ID and account IDs are empty (per source code)
    await expect(postBtn).toBeDisabled()
  })

  test('TC-1.8.3.3: post purchase invoice button disabled without required fields', async ({ page }) => {
    await page.goto('/journals')
    await page.waitForLoadState('networkidle')

    const postBtn = page.getByRole('button', { name: /post purchase invoice/i })
    await expect(postBtn).toBeDisabled()
  })

  test('TC-1.8.3.4: journal list (posted entries) visible', async ({ page }) => {
    await page.goto('/journals')
    await page.waitForLoadState('networkidle')

    // The page has a DataGrid for existing journal entries
    const grid = page.locator('table, [role="grid"]').last()
    await expect(grid).toBeVisible({ timeout: 5_000 })
  })

  test('TC-1.8.4: reversal form has journal ID and date fields', async ({ page }) => {
    await page.goto('/journals')
    await page.waitForLoadState('networkidle')

    await expect(page.getByLabel(/journal entry id/i)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByLabel(/reversal date/i)).toBeVisible()
  })

  test('TC-1.8.3.5: post sales invoice with accounts → shows success or error', async ({ page }) => {
    await page.goto('/journals')
    await page.waitForLoadState('networkidle')

    // Fill a (likely non-existent) invoice ID to trigger a server response
    await fillField(page, /sales invoice id/i, '999999')

    // Select AR account
    const arSelect = page.getByLabel(/ar account/i).first()
    if (await arSelect.isVisible()) {
      await arSelect.click()
      const opt = page.getByRole('option').first()
      if (await opt.isVisible()) await opt.click()
    }

    // Select Revenue account
    const revSelect = page.getByLabel(/revenue account/i).first()
    if (await revSelect.isVisible()) {
      await revSelect.click()
      const opt = page.getByRole('option').first()
      if (await opt.isVisible()) await opt.click()
    }

    const postBtn = page.getByRole('button', { name: /post sales invoice/i })
    await expect(postBtn).toBeEnabled()
    await postBtn.click()

    // Either a success message or an error is shown (not a crash)
    await page.waitForLoadState('networkidle')
    const feedback = page.getByText(
      /posted to journal|not found|error|invalid/i,
    )
    await expect(feedback).toBeVisible({ timeout: 5_000 })
  })
})
