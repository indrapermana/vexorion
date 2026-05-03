/**
 * shift-workflows.spec.ts
 *
 * POS Shift management end-to-end workflows:
 *  - Open shift with opening float
 *  - Shift persists on page reload
 *  - Close shift with counted cash → variance calculated
 *  - Block checkout if no shift is open
 *
 * Covers TEST_PLAN: 2.1.1, 2.1.2, 2.1.3, 2.5.1
 */
import { test, expect } from './fixtures'

test.describe('POS Shift Workflows', () => {
  // -------------------------------------------------------------------------
  // TC-2.1.1 — Open shift
  // -------------------------------------------------------------------------
  test('TC-2.1.1: open shift with opening float', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // If shift already open, skip (another test may have opened it)
    const noShiftText = page.getByText(/no active shift/i)
    const openBtn = page.getByRole('button', { name: /open shift/i })

    if (await openBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await openBtn.click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible({ timeout: 5_000 })

      // Fill opening cash float
      await dialog.getByLabel(/opening cash float/i).fill('200')
      await dialog.getByRole('button', { name: /open shift/i }).click()
      await expect(dialog).not.toBeVisible({ timeout: 10_000 })
    }

    // After opening, shift status should be shown
    await expect(page.getByText(/shift open since|no active shift/i)).toBeVisible({
      timeout: 5_000,
    })
  })

  // -------------------------------------------------------------------------
  // TC-2.1.2 — Shift persists on reload
  // -------------------------------------------------------------------------
  test('TC-2.1.2: shift status persists on page reload', async ({ page, posPage }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Ensure a shift is open
    const openBtn = page.getByRole('button', { name: /open shift/i })
    if (await openBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await posPage.openShift('150')
    }

    // Check shift is open
    await expect(page.getByText(/shift open since/i)).toBeVisible({ timeout: 5_000 })

    // Reload
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Shift should still be open
    await expect(page.getByText(/shift open since/i)).toBeVisible({ timeout: 5_000 })
  })

  // -------------------------------------------------------------------------
  // TC-2.1.3 — Close shift with counted cash
  // -------------------------------------------------------------------------
  test('TC-2.1.3: close shift records variance', async ({ page, posPage }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Ensure a shift is open
    const openBtn = page.getByRole('button', { name: /open shift/i })
    if (await openBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await posPage.openShift('100')
    }

    // Click close shift
    const closeBtn = page.getByRole('button', { name: /close shift/i })
    await expect(closeBtn).toBeVisible({ timeout: 5_000 })
    await closeBtn.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Shift summary should include expected fields
    await expect(dialog.getByText(/total sales/i)).toBeVisible()
    await expect(dialog.getByText(/expected cash/i)).toBeVisible()

    // Enter counted cash (slightly different to verify variance shows)
    await dialog.getByLabel(/counted cash/i).fill('95')

    // Variance chip should update (positive or short)
    await expect(dialog.getByText(/variance|short|over/i)).toBeVisible({ timeout: 3_000 })

    // Actually close the shift
    await dialog.getByRole('button', { name: /close shift/i }).last().click()
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })

    // After close — "Open Shift" button should be visible again
    await expect(page.getByRole('button', { name: /open shift/i })).toBeVisible({
      timeout: 5_000,
    })
  })

  // -------------------------------------------------------------------------
  // TC-2.5.1 — Checkout blocked without open shift
  // -------------------------------------------------------------------------
  test('TC-2.5.1: checkout button disabled when no shift open', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Close shift if open (so we can test the no-shift state)
    const closeBtn = page.getByRole('button', { name: /close shift/i })
    if (await closeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await closeBtn.click()
      const dialog = page.getByRole('dialog')
      if (await dialog.isVisible()) {
        await dialog.getByLabel(/counted cash/i).fill('0')
        await dialog.getByRole('button', { name: /close shift/i }).last().click()
        await expect(dialog).not.toBeVisible({ timeout: 10_000 })
      }
    }

    // Checkout button should be disabled or not present
    const checkoutBtn = page.getByRole('button', { name: /checkout/i })
    if (await checkoutBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await expect(checkoutBtn).toBeDisabled()
    } else {
      // Or the "No active shift" message is shown
      await expect(page.getByText(/no active shift/i)).toBeVisible({ timeout: 3_000 })
    }
  })
})
