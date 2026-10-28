/**
 * Real generated-document lifecycle against the Development API and configured storage.
 * Creates only disposable source records in the isolated automation tenant.
 */
import { authenticatedApi, expectSuccessfulFixture, type CreatedEntity } from './api-helpers'
import { expect, test, uid } from './fixtures'

type GeneratedDocument = {
  generatedDocumentId: string
  sourceEntityId: string
  format: 'Docx' | 'Pdf'
  status: 'Ready' | 'Failed' | 'Superseded'
  version: number
  fileName: string
}

test('generated document lifecycle supports history, preview, download, and regeneration', async ({ page }) => {
  const suffix = uid('generated-document').replace(/[^a-z0-9]/gi, '').slice(-12).toUpperCase()
  let customerId: string | null = null
  let warehouseId: string | null = null
  let salesOrderId: string | null = null

  try {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    customerId = expectSuccessfulFixture(
      await authenticatedApi<CreatedEntity>(page, '/customers', 'POST', {
        customerNumber: `DOC-${suffix}`,
        name: `Document customer ${suffix}`,
        email: `document-${suffix.toLowerCase()}@e2e.invalid`,
      }),
      'Generated-document customer creation',
    ).id
    warehouseId = expectSuccessfulFixture(
      await authenticatedApi<CreatedEntity>(page, '/warehouses', 'POST', {
        code: `D${suffix}`.slice(0, 50),
        name: `Document warehouse ${suffix}`,
        locationDescription: 'Disposable generated-document E2E fixture',
      }),
      'Generated-document warehouse creation',
    ).id
    const orderNumber = `SO-DOC-${suffix}`.slice(0, 50)
    const today = new Date().toISOString().slice(0, 10)
    salesOrderId = expectSuccessfulFixture(
      await authenticatedApi<CreatedEntity>(page, '/sales-orders', 'POST', {
        orderNumber,
        customerId,
        warehouseId,
        orderDate: today,
        requiredDate: today,
        status: 1,
        currencyCode: 'USD',
        notes: 'Disposable generated-document E2E source',
      }),
      'Generated-document sales order creation',
    ).id

    await page.goto('/sales-orders')
    await page.waitForLoadState('networkidle')
    const orderRow = page.getByRole('row').filter({ hasText: orderNumber })
    await expect(orderRow).toBeVisible()
    await orderRow.getByRole('menuitem', { name: /review/i }).click()

    const documentsHeading = page.getByRole('heading', { name: 'Documents', exact: true })
    await expect(documentsHeading).toBeVisible()
    const documentsPanel = documentsHeading.locator('xpath=ancestor::*[contains(@class,"panel-card")][1]')
    await expect(documentsPanel).toContainText(/no documents generated/i)

    await documentsPanel.getByRole('combobox', { name: /format/i }).click()
    await page.getByRole('option', { name: 'DOCX', exact: true }).click()
    const generateResponse = page.waitForResponse((response) => (
      response.request().method() === 'POST' && response.url().endsWith('/api/documents/generate')
    ))
    await documentsPanel.getByRole('button', { name: /export/i }).click()
    const generated = await generateResponse
    expect(generated.status(), await generated.text()).toBe(200)
    await expect(documentsPanel).toContainText('v1')
    await expect(documentsPanel).toContainText('Current')

    const historyAfterGenerate = expectSuccessfulFixture(
      await authenticatedApi<GeneratedDocument[]>(page, `/documents/source/SalesOrder/${salesOrderId}`, 'GET'),
      'Generated-document history after generation',
    )
    expect(historyAfterGenerate).toHaveLength(1)
    const versionOne = historyAfterGenerate[0]
    expect(versionOne).toEqual(expect.objectContaining({ version: 1, status: 'Ready', format: 'Docx' }))

    const previewResponsePromise = page.waitForResponse((response) => (
      response.request().method() === 'GET'
      && response.url().endsWith(`/api/documents/${versionOne.generatedDocumentId}/preview/pdf`)
    ))
    await documentsPanel.getByRole('button', { name: new RegExp(`preview.*${versionOne.fileName}`, 'i') }).click()
    const previewResponse = await previewResponsePromise
    expect(previewResponse.status()).toBe(200)
    expect(previewResponse.headers()['content-type']).toContain('application/pdf')
    expect((await previewResponse.body()).subarray(0, 4).toString()).toBe('%PDF')
    await expect(documentsPanel.getByTitle(/document preview/i)).toBeVisible()
    await documentsPanel.getByText('Close', { exact: true }).click()

    const downloadPromise = page.waitForEvent('download')
    await documentsPanel.getByRole('button', { name: new RegExp(`download.*${versionOne.fileName}`, 'i') }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe(versionOne.fileName)
    const downloadStream = await download.createReadStream()
    const downloadChunks: Buffer[] = []
    for await (const chunk of downloadStream) downloadChunks.push(Buffer.from(chunk))
    const downloadedDocument = Buffer.concat(downloadChunks)
    expect(downloadedDocument.length).toBeGreaterThan(100)
    expect(downloadedDocument.subarray(0, 2).toString()).toBe('PK')

    const regenerateResponse = page.waitForResponse((response) => (
      response.request().method() === 'POST'
      && response.url().endsWith(`/api/documents/${versionOne.generatedDocumentId}/regenerate`)
    ))
    await documentsPanel.getByRole('button', { name: new RegExp(`regenerate.*${versionOne.fileName}`, 'i') }).click()
    expect((await regenerateResponse).status()).toBe(200)
    await expect(documentsPanel).toContainText('v2')
    await expect(documentsPanel).toContainText('Previous')

    const finalHistory = expectSuccessfulFixture(
      await authenticatedApi<GeneratedDocument[]>(page, `/documents/source/SalesOrder/${salesOrderId}`, 'GET'),
      'Generated-document history after regeneration',
    )
    expect(finalHistory).toHaveLength(2)
    expect(finalHistory).toEqual(expect.arrayContaining([
      expect.objectContaining({ version: 1, status: 'Superseded', format: 'Docx' }),
      expect.objectContaining({ version: 2, status: 'Ready', format: 'Docx' }),
    ]))
    expect(finalHistory.find((document) => document.version === 2)?.generatedDocumentId)
      .not.toBe(versionOne.generatedDocumentId)
    await expect(documentsPanel.getByRole('button', { name: /regenerate/i })).toHaveCount(1)
  } finally {
    if (!page.isClosed()) {
      if (salesOrderId) await authenticatedApi(page, `/sales-orders/${salesOrderId}`, 'DELETE').catch(() => undefined)
      if (warehouseId) await authenticatedApi(page, `/warehouses/${warehouseId}`, 'DELETE').catch(() => undefined)
      if (customerId) await authenticatedApi(page, `/customers/${customerId}`, 'DELETE').catch(() => undefined)
    }
  }
})
