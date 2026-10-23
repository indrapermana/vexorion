import { test, expect } from './fixtures'

const routes = [
  '/',
  '/reports',
  '/customers',
  '/sales-orders',
  '/sales-invoices',
  '/sales-shipments',
  '/customer-payments',
  '/accounts',
  '/fiscal-periods',
  '/journals',
  '/config/tax-discount',
  '/audit-logs',
  '/config',
  '/config/users',
  '/config/roles',
  '/config/menu',
  '/config/company',
  '/config/import-data',
  '/config/product-categories',
  '/products',
  '/project-categories',
  '/projects',
  '/project-documents',
  '/tenant-relationships',
  '/employees',
  '/consultants',
  '/inventory-adjustments',
  '/stock-counts',
  '/stock-transfers',
  '/warehouses',
  '/purchase-invoices',
  '/purchase-orders',
  '/purchase-receipts',
  '/vendor-payments',
  '/suppliers',
]

const viewportWidths = [360, 768, 1024, 1440]

test.describe('Responsive acceptance', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('vexorionerp.ui.language', 'esES')
      window.localStorage.setItem('vexorion.themeMode', 'dark')
    })
  })

  for (const route of routes) {
    test(`${route} fits the responsive viewport matrix`, async ({ page }) => {
      await page.goto(route)
      await expect(page.getByRole('heading').first()).toBeVisible()
      await expect(page).toHaveURL(new RegExp(`${route === '/' ? '/$' : `${route.replaceAll('/', '\\/')}$`}`))

      for (const width of viewportWidths) {
        await page.setViewportSize({ width, height: 900 })
        if (width === 360 || width === 1440) {
          await page.screenshot({
            path: `test-results/responsive/all-routes/${route.replaceAll('/', '-') || 'home'}-${width}.png`,
            fullPage: true,
          })
        }

        const dimensions = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          document: document.documentElement.scrollWidth,
        }))
        expect(
          dimensions.document,
          `${route} overflows at ${width}px: document width ${dimensions.document}px, viewport ${dimensions.viewport}px`,
        ).toBeLessThanOrEqual(dimensions.viewport)
      }

      await page.setViewportSize({ width: 720, height: 900 })
      const zoomProxyDimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
      }))
      expect(
        zoomProxyDimensions.document,
        `${route} overflows the 200% zoom-width proxy for a 1440px viewport: document width ${zoomProxyDimensions.document}px, viewport ${zoomProxyDimensions.viewport}px`,
      ).toBeLessThanOrEqual(zoomProxyDimensions.viewport)

      await page.evaluate(() => {
        window.localStorage.setItem('vexorionerp.ui.language', 'idID')
        window.localStorage.setItem('vexorion.themeMode', 'light')
      })
      await page.reload()
      await expect(page.getByRole('heading').first()).toBeVisible()
      await page.setViewportSize({ width: 360, height: 900 })
      const lightThemeDimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
      }))
      expect(
        lightThemeDimensions.document,
        `${route} overflows at 360px in Indonesian light mode: document width ${lightThemeDimensions.document}px, viewport ${lightThemeDimensions.viewport}px`,
      ).toBeLessThanOrEqual(lightThemeDimensions.viewport)
      await page.screenshot({
        path: `test-results/responsive/${route.replaceAll('/', '-')}-360-id-light.png`,
        fullPage: true,
      })
    })
  }

  test.skip('browser zoom shortcut produces a 200% CSS viewport without horizontal page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await expect(page.getByRole('heading').first()).toBeVisible()

    const initialWidth = await page.evaluate(() => window.innerWidth)
    for (let step = 0; step < 4; step += 1) {
      await page.keyboard.press('Meta+Shift+Equal')
    }

    await expect.poll(() => page.evaluate(() => window.innerWidth)).toBeLessThanOrEqual(initialWidth / 1.8)
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }))
    expect(
      dimensions.document,
      `200% browser zoom overflows: document width ${dimensions.document}px, viewport ${dimensions.viewport}px`,
    ).toBeLessThanOrEqual(dimensions.viewport)
    await page.screenshot({ path: 'test-results/responsive/all-routes/browser-zoom-200.png', fullPage: true })
  })
})
