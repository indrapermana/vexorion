/**
 * imports.spec.ts — TC-M-059 (real-record import E2E flow)
 *
 * Real template download -> invalid XLSX upload -> annotated error -> edit
 * preview -> server revalidation -> real submit -> verify created customer.
 */
import { authenticatedApi, expectSuccessfulFixture } from './api-helpers'
import { test, expect, uid } from './fixtures'
import { createCustomerImportWorkbook } from './xlsx-fixture'

type CustomerListItem = {
  id: string
  customerNumber: string
  name: string
  email?: string | null
}

test.describe('Config — Import Data', () => {
  test('TC-M-059: real import flow corrects an invalid row and creates the customer', async ({ page }) => {
    const suffix = uid('import').replace(/[^a-z0-9]/gi, '').slice(-12).toUpperCase()
    const customerNumber = `E2E-${suffix}`
    const customerName = `Imported customer ${suffix}`
    const customerEmail = `import-${suffix.toLowerCase()}@e2e.invalid`
    let createdCustomerId: string | null = null

    try {
      await page.goto('/config/import-data')
      await page.waitForLoadState('networkidle')

      const templateDownloadPromise = page.waitForEvent('download')
      await page.getByRole('button', { name: /download template/i }).click()
      const templateDownload = await templateDownloadPromise
      expect(templateDownload.suggestedFilename()).toBe('customer-template.xlsx')
      const templateStream = await templateDownload.createReadStream()
      const templateChunks: Buffer[] = []
      for await (const chunk of templateStream) templateChunks.push(Buffer.from(chunk))
      expect(Buffer.concat(templateChunks).subarray(0, 2).toString()).toBe('PK')
      await page.getByRole('button', { name: /^next$/i }).click()

      await page.locator('input[type="file"]').setInputFiles({
        name: `${customerNumber}-invalid.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: createCustomerImportWorkbook({ customerNumber, name: '', email: customerEmail }),
      })

      const validationResponse = page.waitForResponse((response) => (
        response.request().method() === 'POST' && response.url().endsWith('/api/imports/validate')
      ))
      await page.getByRole('button', { name: /^next$/i }).click()
      expect((await validationResponse).status()).toBe(200)

      const issueTable = page.getByRole('table', { name: /issues and correction path|issue summary/i })
      await expect(issueTable).toContainText('Template')
      await expect(issueTable).toContainText('2')
      await expect(issueTable).toContainText('B')
      await expect(issueTable).toContainText('Name')
      await expect(issueTable).toContainText(/Name is required/i)
      await expect(issueTable).toContainText(/edit.*validate again/i)

      const nameCell = page.locator('[data-id="2"] [data-field="Name"]')
      await nameCell.dblclick()
      const nameEditor = nameCell.locator('input')
      await expect(nameEditor).toBeVisible()
      await nameEditor.fill(customerName)
      await nameEditor.press('Enter')
      await expect(nameCell).toHaveText(customerName)

      const revalidationResponse = page.waitForResponse((response) => (
        response.request().method() === 'POST' && response.url().endsWith('/api/imports/validate-rows')
      ))
      await page.getByRole('button', { name: /^next$/i }).click()
      expect((await revalidationResponse).status()).toBe(200)
      await expect(page.getByText(/Valid rows: 1/i)).toBeVisible()

      const submitResponse = page.waitForResponse((response) => (
        response.request().method() === 'POST'
        && /\/api\/imports\/[0-9a-f-]+\/submit$/i.test(response.url())
      ))
      await page.getByRole('button', { name: /^submit import$/i }).click()
      expect((await submitResponse).status()).toBe(200)
      await expect(page.getByText(/Import submitted/i)).toBeVisible()

      const customers = expectSuccessfulFixture(
        await authenticatedApi<CustomerListItem[]>(page, '/customers', 'GET'),
        'Imported customer lookup',
      )
      const importedCustomer = customers.find((customer) => customer.customerNumber === customerNumber)
      expect(importedCustomer, `Customer ${customerNumber} was not created by the import.`).toEqual(expect.objectContaining({
        customerNumber,
        name: customerName,
        email: customerEmail,
      }))
      createdCustomerId = importedCustomer?.id ?? null
    } finally {
      if (!page.isClosed()) {
        if (!createdCustomerId) {
          const lookup = await authenticatedApi<CustomerListItem[]>(page, '/customers', 'GET').catch(() => null)
          createdCustomerId = lookup?.body?.find((customer) => customer.customerNumber === customerNumber)?.id ?? null
        }
        if (createdCustomerId) await authenticatedApi(page, `/customers/${createdCustomerId}`, 'DELETE')
      }
    }
  })
})
