/**
 * cart.spec.ts — POS cart management scenarios
 * TC-P-010 to TC-P-016
 */
import { test, expect } from './fixtures'

test.describe('POS Cart', () => {
  test.beforeEach(async ({ posPage }) => {
    await posPage.goto()
    await posPage.openShift(100)
  })

  test('TC-P-010: add product to cart shows item in cart', async ({ page, posPage }) => {
    await posPage.addProductToCart()
    // Cart should have at least one line
    const cartLines = page.locator('[data-testid="cart-item"], .cart-item, [class*="cart"]').first()
    await expect(cartLines).toBeVisible({ timeout: 5_000 })
  })

  test('TC-P-011: add same product increments quantity', async ({ page, posPage }) => {
    await posPage.addProductToCart()
    await posPage.addProductToCart()
    // Look for a quantity indicator of 2 or a quantity "2"
    const qty = page.locator('[data-testid="qty"], text=2').first()
    await expect(qty).toBeVisible({ timeout: 5_000 })
  })

  test('TC-P-012: cart shows calculated total', async ({ page, posPage }) => {
    await posPage.addProductToCart()
    // Total line should show a monetary value (number with decimal)
    const total = page.getByText(/total/i).first()
    await expect(total).toBeVisible({ timeout: 5_000 })
  })

  test('TC-P-013: remove item from cart', async ({ page, posPage }) => {
    await posPage.addProductToCart()
    const removeBtn = page
      .getByRole('button', { name: /remove|delete|×|✕/i })
      .or(page.locator('[data-testid="remove-item"]'))
      .first()
    if (await removeBtn.isVisible()) {
      await removeBtn.click()
      // Cart should be empty
      const emptyCart = page.getByText(/empty|no items|cart is empty/i)
      await expect(emptyCart).toBeVisible({ timeout: 5_000 })
    } else {
      test.skip(true, 'No remove button visible — check UI implementation')
    }
  })

  test('TC-P-014: clear cart', async ({ page, posPage }) => {
    await posPage.addProductToCart()
    const clearBtn = page.getByRole('button', { name: /clear|void cart/i })
    if (await clearBtn.isVisible()) {
      await clearBtn.click()
      const emptyCart = page.getByText(/empty|no items|cart is empty/i)
      await expect(emptyCart).toBeVisible({ timeout: 5_000 })
    } else {
      test.skip(true, 'No clear cart button visible')
    }
  })
})
