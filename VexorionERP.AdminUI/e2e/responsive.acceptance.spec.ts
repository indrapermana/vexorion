import { test, expect } from './fixtures'

const routes = ['/', '/tenants', '/menu-configuration', '/users']
const viewportWidths = [360, 768, 1024, 1440]

test.describe('AdminUI responsive acceptance', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (!window.sessionStorage.getItem('admin-responsive-initialized')) {
        window.localStorage.setItem('language', 'esES')
        window.localStorage.setItem('vexorion.admin.themeMode', 'dark')
        window.sessionStorage.setItem('admin-responsive-initialized', 'true')
      }
    })
  })

  for (const route of routes) {
    test(`${route} fits the responsive viewport matrix`, async ({ page }) => {
      await page.goto(route)
      await expect(page.getByRole('heading').first()).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('data-theme-mode', 'dark')
      await expect(page.getByText(/^undefined ·/)).toHaveCount(0)
      await expect(page).toHaveURL(new RegExp(`${route === '/' ? '/$' : `${route.replaceAll('/', '\\/')}$`}`))

      for (const width of viewportWidths) {
        await page.setViewportSize({ width, height: 900 })
        const dimensions = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          document: document.documentElement.scrollWidth,
          overflowElements: Array.from(document.querySelectorAll('body *'))
            .map((element) => {
              const rect = element.getBoundingClientRect()
              return {
                tag: element.tagName,
                className: typeof element.className === 'string' ? element.className : '',
                right: Math.round(rect.right),
                width: Math.round(rect.width),
                scrollWidth: element.scrollWidth,
                clientWidth: element.clientWidth,
              }
            })
            .filter((element) => element.right > window.innerWidth + 1)
            .sort((left, right) => right.right - left.right)
            .slice(0, 5),
        }))
        if (width === 360 || width === 1440) {
          await page.screenshot({
            path: `test-results/responsive/${route.replaceAll('/', '-') || 'home'}-${width}.png`,
            fullPage: true,
          })
        }
        expect(
          dimensions.document,
          `${route} overflows at ${width}px: document width ${dimensions.document}px, viewport ${dimensions.viewport}px; elements ${JSON.stringify(dimensions.overflowElements)}`,
        ).toBeLessThanOrEqual(dimensions.viewport)
        if (width === 1440) {
          const sidebar = await page.locator('.MuiDrawer-paper:visible').boundingBox()
          const main = await page.locator('.dashboard-main').boundingBox()
          const content = await page.locator('.dashboard-content').boundingBox()
          const pageHeader = await page.locator('.hero-panel').boundingBox()
          expect(sidebar).not.toBeNull()
          expect(main).not.toBeNull()
          expect(content).not.toBeNull()
          expect(pageHeader).not.toBeNull()
          expect(main!.x, 'Desktop content must start after the permanent navigation').toBeGreaterThanOrEqual(sidebar!.x + sidebar!.width - 1)
          expect(main!.x + main!.width, 'Desktop content must remain inside the viewport').toBeLessThanOrEqual(width + 1)
          expect(content!.x, `Dashboard content escaped its main column: ${JSON.stringify({ sidebar, main, content, pageHeader })}`).toBeGreaterThanOrEqual(main!.x)
          expect(pageHeader!.x, `Page header is obscured by navigation: ${JSON.stringify({ sidebar, main, content, pageHeader })}`).toBeGreaterThanOrEqual(content!.x)
        }
      }

      await page.evaluate(() => {
        window.localStorage.setItem('language', 'idID')
        window.localStorage.setItem('vexorion.admin.themeMode', 'light')
      })
      await page.reload()
      await expect(page.getByRole('heading').first()).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('data-theme-mode', 'light')
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
        path: `test-results/responsive/${route.replaceAll('/', '-') || 'home'}-360-id-light.png`,
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
    await page.screenshot({ path: 'test-results/responsive/browser-zoom-200.png', fullPage: true })
  })
})
