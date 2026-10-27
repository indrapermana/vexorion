/**
 * imports.spec.ts — TC-M-059 (Import E2E flow)
 *
 * Scenario:
 * template download -> invalid upload -> edit preview -> revalidate
 * -> review summary -> submit success
 */
import { test, expect } from './fixtures'

test.describe('Config — Import Data', () => {
  test('TC-M-059: full import flow supports correction and successful submit', async ({ page }, testInfo) => {
    const errorWorkbookContent = Buffer.from('mock-error-workbook').toString('base64')
    let validateCalls = 0
    let rowValidateCalls = 0
    let revalidatedEmail = ''
    let submitCalls = 0

    await page.route('**/api/imports/types', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { importType: 'customer', columns: ['CustomerNumber', 'Name', 'Email'] },
        ]),
      })
    })

    await page.route('**/api/imports/history**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.route('**/api/imports/validate', async (route) => {
      validateCalls += 1

      if (validateCalls === 1) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            importJobId: '11111111-1111-1111-1111-111111111111',
            importType: 'customer',
            sourceFileName: 'customers-invalid.xlsx',
            status: 3,
            totalRows: 1,
            validRows: 0,
            invalidRows: 1,
            errorWorkbookFileName: 'customer-errors.xlsx',
            errorWorkbookContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            errorWorkbookContent,
            errors: [
              {
                rowNumber: 2,
                columnName: 'Email',
                category: 'Validation',
                message: 'Invalid email format',
              },
            ],
            previewHeaders: ['CustomerNumber', 'Name', 'Email'],
            previewRows: [{ rowNumber: 2, values: { CustomerNumber: 'C001', Name: 'Customer One', Email: 'invalid' } }],
          }),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          importJobId: '22222222-2222-2222-2222-222222222222',
          importType: 'customer',
          sourceFileName: 'customers-invalid.xlsx',
          status: 2,
          totalRows: 1,
          validRows: 1,
          invalidRows: 0,
          errors: [],
          previewHeaders: ['CustomerNumber', 'Name', 'Email'],
          previewRows: [{ rowNumber: 2, values: { CustomerNumber: 'C001', Name: 'Customer One', Email: 'fixed@example.com' } }],
        }),
      })
    })

    await page.route('**/api/imports/validate-rows', async (route) => {
      rowValidateCalls += 1
      const request = route.request().postDataJSON() as { rows: Array<{ values: { Email: string } }> }
      revalidatedEmail = request.rows[0].values.Email
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          importJobId: '22222222-2222-2222-2222-222222222222',
          importType: 'customer',
          sourceFileName: 'customers-invalid.xlsx',
          status: 2,
          totalRows: 1,
          validRows: 1,
          invalidRows: 0,
          errors: [],
          previewHeaders: ['CustomerNumber', 'Name', 'Email'],
          previewRows: [{ rowNumber: 2, values: { CustomerNumber: 'C001', Name: 'Customer One', Email: revalidatedEmail } }],
        }),
      })
    })

    await page.route('**/api/imports/*/submit', async (route) => {
      submitCalls += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          importJobId: '22222222-2222-2222-2222-222222222222',
          importType: 'customer',
          sourceFileName: 'customers-invalid.xlsx',
          status: 4,
          totalRows: 1,
          validRows: 1,
          invalidRows: 0,
          validatedAtUtc: null,
          submittedAtUtc: null,
          completedAtUtc: null,
          errorSummary: null,
        }),
      })
    })

    await page.goto('/config/import-data')
    await page.waitForLoadState('networkidle')

    // Step 1: template download
    const templateDownloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /download template/i }).click()
    const templateDownload = await templateDownloadPromise
    expect(templateDownload.suggestedFilename()).toBe('customer-template.xlsx')
    const templateStream = await templateDownload.createReadStream()
    const templateChunks: Buffer[] = []
    for await (const chunk of templateStream) templateChunks.push(Buffer.from(chunk))
    expect(Buffer.concat(templateChunks).subarray(0, 2).toString()).toBe('PK')
    await page.getByRole('button', { name: /^next$/i }).click()

    // Step 2: upload and validate
    await page.locator('input[type="file"]').setInputFiles({
      name: 'customers-invalid.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('invalid-file-content'),
    })

    await page.getByRole('button', { name: /^next$/i }).click()
    await expect(page.getByText('Invalid email format')).toBeVisible()
    const emailCell = page.locator('[data-id="2"] [data-field="Email"]')
    await emailCell.dblclick()
    const emailEditor = emailCell.locator('input')
    await expect(emailEditor).toBeVisible()
    await emailEditor.fill('fixed@example.com')
    await emailEditor.press('Enter')
    await expect(emailCell).toHaveText('fixed@example.com')
    await page.getByRole('button', { name: /^next$/i }).click()
    await expect.poll(() => rowValidateCalls).toBe(1)
    expect(revalidatedEmail).toBe('fixed@example.com')

    // Step 4: summary and submit
    await expect(page.getByText(/Valid rows: 1/i)).toBeVisible()
    expect(submitCalls).toBe(0)
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport)
      await expect(page.getByRole('button', { name: /^submit import$/i })).toBeVisible()
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth), { message: `No page overflow at ${viewport.width}px` }).toBeLessThanOrEqual(viewport.width)
      await page.screenshot({ path: testInfo.outputPath(`import-submit-${viewport.width}.png`), fullPage: true })
    }
    await page.getByRole('button', { name: /^submit import$/i }).click()
    await expect(page.getByText(/Import submitted/i)).toBeVisible()

    expect(validateCalls).toBe(1)
    expect(submitCalls).toBe(1)
  })
})
