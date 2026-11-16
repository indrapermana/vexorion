/**
 * Cross-cutting browser security assertions.
 *
 * Formula-neutralization is covered at every reporting CSV endpoint by
 * ReportingControllerIntegrationTests.Reports_Exports_NeutralizeFormulaText.
 */
import { expect, test, uid } from './fixtures'
import { authenticatedApi, expectSuccessfulFixture, type CreatedEntity } from './api-helpers'

test('SEC-002: stored script payload renders only as inert customer text', async ({ page }) => {
  const suffix = uid('security').slice(-18)
  const scriptPayload = `<img src=x onerror="window.__vexorionXssExecuted=true"> ${suffix}`
  let customerId: string | null = null

  await page.goto('/')
  try {
    customerId = expectSuccessfulFixture(
      await authenticatedApi<CreatedEntity>(page, '/customers', 'POST', {
        customerNumber: `=1+1-${suffix}`.slice(0, 50),
        name: scriptPayload,
        contactName: `<script>window.__vexorionXssExecuted=true</script>`,
        billingAddress: `javascript:window.__vexorionXssExecuted=true`,
        creditLimit: 0,
      }),
      'Security payload customer creation',
    ).id

    const persisted = expectSuccessfulFixture(
      await authenticatedApi<{ name: string; contactName: string; billingAddress: string }>(
        page,
        `/customers/${customerId}`,
        'GET',
      ),
      'Security payload persistence check',
    )
    expect(persisted).toMatchObject({
      name: scriptPayload,
      contactName: `<script>window.__vexorionXssExecuted=true</script>`,
      billingAddress: `javascript:window.__vexorionXssExecuted=true`,
    })

    await page.goto('/customers')
    await expect(page.getByText(scriptPayload, { exact: true })).toBeVisible()
    await page.goto(`/customers?search=${encodeURIComponent(scriptPayload)}`)
    expect(await page.evaluate(() => (window as Window & { __vexorionXssExecuted?: boolean }).__vexorionXssExecuted)).toBeUndefined()
    await expect(page.locator('img[src="x"]')).toHaveCount(0)
    await expect(page.locator('script').filter({ hasText: '__vexorionXssExecuted' })).toHaveCount(0)
  } finally {
    if (customerId && !page.isClosed()) {
      const deletion = await authenticatedApi(page, `/customers/${customerId}`, 'DELETE')
      expect(deletion.status).toBeGreaterThanOrEqual(200)
      expect(deletion.status).toBeLessThan(300)
    }
  }
})

test('SEC-005: product images are anonymously readable only through the configured public URL', async ({ page, request }) => {
  const suffix = uid('public-image').slice(-18)
  let productId: string | null = null
  let imageUrl: string | null = null

  await page.goto('/')
  try {
    productId = expectSuccessfulFixture(
      await authenticatedApi<CreatedEntity>(page, '/products', 'POST', {
        sku: `IMG-${suffix}`.slice(0, 50),
        name: `Public image security ${suffix}`,
        unitOfMeasure: 'EA',
        isActive: true,
      }),
      'Public image product creation',
    ).id

    const upload = await page.evaluate(async ({ id }) => {
      const persistedAuth = window.localStorage.getItem('vexorionerp.auth')
      const accessToken = persistedAuth
        ? (JSON.parse(persistedAuth) as { state?: { session?: { accessToken?: string } } }).state?.session?.accessToken
        : undefined
      if (!accessToken) throw new Error('Authenticated E2E session is missing its access token.')

      const pngBytes = Uint8Array.from(
        atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='),
        (character) => character.charCodeAt(0),
      )
      const form = new FormData()
      form.append('file', new Blob([pngBytes], { type: 'image/png' }), 'security-pixel.png')
      const response = await fetch(`/api/products/${id}/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      })
      return { status: response.status, body: await response.json() as { imageUrl?: string } }
    }, { id: productId })

    expect(upload.status, JSON.stringify(upload.body)).toBe(200)
    imageUrl = upload.body.imageUrl ?? null
    expect(imageUrl).toMatch(/^https:\/\/images\.vexorionerp\.com\//)

    const anonymousRead = await request.get(imageUrl!)
    expect(anonymousRead.status()).toBe(200)
    expect(anonymousRead.headers()['content-type']).toContain('image/')
  } finally {
    if (productId && !page.isClosed()) {
      const deletion = await authenticatedApi(page, `/products/${productId}`, 'DELETE')
      expect(deletion.status).toBeGreaterThanOrEqual(200)
      expect(deletion.status).toBeLessThan(300)
    }
  }
})
