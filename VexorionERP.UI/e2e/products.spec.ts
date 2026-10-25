/**
 * products.spec.ts — TC-M-016 to TC-M-019 (Product CRUD)
 */
import { test, expect, GenericCrudPage, uid } from './fixtures'

const UNIQUE = () => uid('E2E-PROD')

test.describe('Products', () => {
  test('UX-MASTER-01: product list follows shared header metrics and searchable list pattern', async ({ page }) => {
    const crud = new GenericCrudPage(page, '/products')
    await crud.goto()

    const firstName = UNIQUE()
    const firstSku = uid('SKU')
    const secondName = UNIQUE()
    const secondSku = uid('SKU')

    for (const [name, sku] of [[firstName, firstSku], [secondName, secondSku]]) {
      await crud.clickAdd()
      const dialog = page.getByRole('dialog')
      await dialog.getByLabel('Product name').fill(name)
      await dialog.getByLabel('SKU').fill(sku)
      await crud.saveDialog()
      await expect(dialog).not.toBeVisible({ timeout: 8_000 })
    }

    const search = page.getByLabel('Search or filter', { exact: true })
    await expect(search).toBeVisible()
    await expect(page.getByRole('region', { name: 'Page metrics' })).toContainText(/Catalog rows/)
    await expect(page.getByText(firstName, { exact: true })).toBeVisible()
    await expect(page.getByText(secondName, { exact: true })).toBeVisible()

    await search.fill(firstSku)
    await expect(page.getByText(firstName, { exact: true })).toBeVisible()
    await expect(page.getByText(secondName, { exact: true })).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Page metrics' })).toContainText(/Catalog rows/)
    const expandProduct = page.getByRole('button', { name: `Expand product details: ${firstName}` })
    await expandProduct.click()
    await expect(page.getByText('No description provided.', { exact: true })).toBeVisible()
    await page.getByRole('tab', { name: 'Purchase history' }).click()
    await expect(page.getByText('No posted purchase invoice history in the last 12 months.', { exact: true })).toBeVisible()

    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await expect(search).toBeVisible()
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    }
  })

  test('UX-MASTER-02: product details, editing, stock, identifiers, and purchase history share one workspace', async ({ page }) => {
    const crud = new GenericCrudPage(page, '/products')
    await crud.goto()
    await crud.clickAdd()
    const dialog = page.getByRole('dialog')
    const productName = UNIQUE()
    const sku = uid('SKU')
    await dialog.getByLabel('Product name').fill(productName)
    await dialog.getByLabel('SKU').fill(sku)
    await crud.saveDialog()
    await expect(dialog).not.toBeVisible({ timeout: 8_000 })

    await page.getByRole('button', { name: `Expand product details: ${productName}` }).click()
    await expect(page.getByRole('heading', { name: productName, exact: true })).toBeVisible()
    await expect(page.getByText('No description provided.', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    const editor = page.getByRole('dialog')
    await expect(editor.getByLabel('Product name')).toHaveValue(productName)
    await expect(editor.getByLabel('SKU')).toHaveValue(sku)
    await expect(editor.getByLabel('Choose product image')).toBeVisible()
    await editor.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(editor).not.toBeVisible()

    await page.getByRole('tab', { name: 'Stock', exact: true }).click()
    await expect(page.getByText('No warehouse balances are posted for this product yet.', { exact: true })).toBeVisible()
    await page.getByRole('tab', { name: 'Identifiers', exact: true }).click()
    await expect(page.getByText('No identifiers assigned to this product yet.', { exact: true })).toBeVisible()
    await page.getByRole('tab', { name: 'Purchase history', exact: true }).click()
    await expect(page.getByText('No posted purchase invoice history in the last 12 months.', { exact: true })).toBeVisible()
  })

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
    const sku = uid('SKU')

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
