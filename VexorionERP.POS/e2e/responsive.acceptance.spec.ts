import { test, expect } from './fixtures'

const routes = ['/', '/admin']
const viewportWidths = [360, 768, 1024, 1440]

test.describe('POS responsive acceptance', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('vexorion.pos.locale', 'es')
      window.localStorage.setItem('vexorion.pos.themeMode', 'dark')
    })
  })

  for (const route of routes) {
    test(`${route} fits the responsive viewport matrix`, async ({ page }) => {
      await page.goto(route)
      await expect(page.getByRole('heading').first()).toBeVisible()
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
                left: Math.round(rect.left),
                right: Math.round(rect.right),
                width: Math.round(rect.width),
              }
            })
            .filter((element) => element.right > window.innerWidth + 1 && element.right < window.innerWidth + 400)
            .sort((left, right) => right.right - left.right)
            .slice(0, 8),
        }))
        if (width === 360 || width === 1440) {
          await page.screenshot({
            path: `test-results/responsive/${route === '/' ? 'workspace' : 'admin'}-${width}.png`,
            fullPage: true,
          })
        }
        expect(
          dimensions.document,
          `${route} overflows at ${width}px: document width ${dimensions.document}px, viewport ${dimensions.viewport}px; elements ${JSON.stringify(dimensions.overflowElements)}`,
        ).toBeLessThanOrEqual(dimensions.viewport)
      }

      await page.evaluate(() => {
        window.localStorage.setItem('vexorion.pos.locale', 'id')
        window.localStorage.setItem('vexorion.pos.themeMode', 'light')
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
        path: `test-results/responsive/${route === '/' ? 'workspace' : 'admin'}-360-id-light.png`,
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
