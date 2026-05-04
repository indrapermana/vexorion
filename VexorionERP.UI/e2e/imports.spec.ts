/**
 * imports.spec.ts — TC-M-059 (Import E2E flow)
 *
 * Scenario:
 * template download -> invalid upload -> error workbook download
 * -> corrected upload -> submit success
 */
import { test, expect } from './fixtures'

test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Config — Import Data', () => {
  test('TC-M-059: full import flow supports correction and successful submit', async ({ page }) => {
    const errorWorkbookContent = Buffer.from('mock-error-workbook').toString('base64')
    let validateCalls = 0
    let templateDownloadCalls = 0

    await page.addInitScript(() => {
      localStorage.setItem(
        'vexorionerp.auth',
        JSON.stringify({
          state: {
            session: {
              accessToken: 'e2e-access-token',
              refreshToken: 'e2e-refresh-token',
              expiresAtUtc: '2099-01-01T00:00:00.000Z',
            },
          },
          version: 0,
        }),
      )
    })

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          tenantId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          userName: 'e2e.admin',
          email: 'e2e.admin@demo.local',
          firstName: 'E2E',
          lastName: 'Admin',
          roles: ['Administrator'],
          permissions: [
            'imports.validate',
            'imports.submit',
            'imports.history.view',
          ],
        }),
      })
    })

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

    await page.route('**/api/imports/template/**', async (route) => {
      templateDownloadCalls += 1
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="customer-template.xlsx"',
        },
        body: 'template-bytes',
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
          status: 2,
          totalRows: 1,
          validRows: 1,
          invalidRows: 0,
          errors: [],
        }),
      })
    })

    await page.route('**/api/imports/*/submit', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          importJobId: '22222222-2222-2222-2222-222222222222',
          importType: 'customer',
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
    await page.getByRole('button', { name: /download template/i }).click()
    await expect.poll(() => templateDownloadCalls).toBe(1)

    // Step 2A: invalid upload and validation
    await page.locator('input[type="file"]').setInputFiles({
      name: 'customers-invalid.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('invalid-file-content'),
    })

    await page.getByRole('button', { name: /^validate$/i }).click()
    await expect(page.getByText('Invalid email format')).toBeVisible()

    // Error workbook download should be available after failed validation.
    await expect(page.getByRole('button', { name: /download error workbook/i })).toBeVisible()
    await page.getByRole('button', { name: /download error workbook/i }).click()

    // Step 2B: corrected upload and re-validation
    await page.locator('input[type="file"]').setInputFiles({
      name: 'customers-corrected.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('corrected-file-content'),
    })

    await page.getByRole('button', { name: /^validate$/i }).click()
    await expect(page.getByText(/All rows are valid/i)).toBeVisible()

    // Step 3: submit success
    await page.getByRole('button', { name: /submit import/i }).click()
    await expect(page.getByText(/Import submitted/i)).toBeVisible()

    expect(validateCalls).toBe(2)
  })
})
