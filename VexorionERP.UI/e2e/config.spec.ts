/**
 * config.spec.ts — TC-M-048 to TC-M-058 (Configuration sub-pages)
 */
import { test, expect, GenericCrudPage, uid } from './fixtures'
import enUS from '../src/i18n/locales/enUS'
import idID from '../src/i18n/locales/idID'
import esES from '../src/i18n/locales/esES'

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
  test('UX-DASH-04: preview separates preferences from access and saved navigation', async ({ page }, testInfo) => {
    test.setTimeout(60_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    const preferenceFailures: string[] = []
    page.on('response', async (response) => {
      if (new URL(response.url()).pathname.endsWith('/configuration/preferences') && !response.ok()) {
        preferenceFailures.push(`${response.status()}: ${await response.text()}`)
      }
    })
    await page.route('**/api/tenants/*/modules', async (route) => {
      const response = await route.fetch()
      const modules = await response.json()
      await route.fulfill({ response, json: { ...modules, projectManagementEnabled: false } })
    })
    await page.goto('/config/menu')
    await page.waitForLoadState('networkidle')
    expect(preferenceFailures).toEqual([])
    const projects = page.locator('tr[data-menu-path="/projects"]')
    const customers = page.locator('tr[data-menu-path="/customers"]')
    const documents = page.locator('tr[data-menu-path="/project-documents"]')
    await expect(projects.getByText('Module disabled', { exact: true })).toBeVisible()
    await expect(projects.getByRole('checkbox')).toBeChecked()
    await expect(page.getByRole('link', { name: 'Projects', exact: true })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Customers', exact: true })).toBeVisible()
    await customers.getByRole('checkbox').uncheck()
    await documents.getByRole('checkbox').uncheck()
    await expect(customers.getByText('Hidden by preference', { exact: true })).toBeVisible()
    await expect(customers.getByText('View permitted', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Customers', exact: true })).toBeVisible()
    await expect(page.getByText('Unsaved preferences', { exact: true })).toBeVisible()

    const saved = page.waitForResponse((response) => response.request().method() === 'PUT' && response.url().endsWith('/configuration/preferences/menu') && response.ok())
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    const saveResponse = await saved
    expect((await saveResponse.json()).hiddenMenuLinks).toEqual(expect.arrayContaining(['/customers', '/project-documents']))
    await expect(page.getByText('Menu visibility updated.', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Customers', exact: true })).toHaveCount(0)
    await page.goto('/customers')
    await expect(page.getByRole('heading', { level: 1, name: 'Customers', exact: true })).toBeVisible()
    await page.goto('/config/menu')
    await expect(customers.getByRole('checkbox')).not.toBeChecked()
    await expect(documents.getByRole('checkbox')).not.toBeChecked()
    await page.getByRole('button', { name: 'Reset defaults', exact: true }).click()
    await expect(page.getByText('Menu visibility reset to default.', { exact: true })).toBeVisible()
    await expect(customers.getByRole('checkbox')).toBeChecked()
    await expect(page.getByRole('link', { name: 'Customers', exact: true })).toBeVisible()
    await expect(projects.getByText('Module disabled', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Projects', exact: true })).toHaveCount(0)

    for (const [language, copy] of [['enUS', enUS], ['idID', idID], ['esES', esES]] as const) {
      await page.getByLabel(/Language selector|Pemilih bahasa|Selector de idioma/).click()
      await page.locator(`[role="option"][data-value="${language}"]`).click()
      await expect(page.getByRole('region', { name: copy.config.menu.previewTitle, exact: true })).toBeVisible()
      await expect(projects.getByText(copy.config.menu.results.moduleDisabled, { exact: true })).toBeVisible()
      await expect(page.getByText(copy.config.menu.accessPolicy, { exact: true })).toBeVisible()
      for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
        await page.screenshot({ path: testInfo.outputPath(`menu-access-${language}-${width}.png`), fullPage: true, animations: 'disabled' })
      }
    }
  })

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
