/**
 * Project document lifecycle E2E coverage.
 *
 * Creates disposable project fixtures through authenticated APIs, then uses
 * the browser UI for upload, versioning, preview, and download operations.
 */
import { request as playwrightRequest } from '@playwright/test'
import { expect, test, uid } from './fixtures'
import { authenticatedApi, expectSuccessfulFixture, type CreatedEntity } from './api-helpers'

type ProjectDocumentUploadResponse = CreatedEntity & {
  fileName: string
}

type ProjectDocumentVersion = CreatedEntity & {
  versionNumber: number
  fileName: string
  checksum?: string | null
}

type ProjectDocumentDownload = {
  downloadUrl: string
  fileName: string
  contentType: string
  fileSizeBytes: number
}

function getSignedUrlExpiry(downloadUrl: string): number {
  const url = new URL(downloadUrl)
  const signedAt = url.searchParams.get('X-Amz-Date')
  const lifetimeSeconds = Number(url.searchParams.get('X-Amz-Expires'))
  if (!signedAt || !/^\d{8}T\d{6}Z$/u.test(signedAt) || !Number.isFinite(lifetimeSeconds)) {
    throw new Error('R2 download URL is missing valid X-Amz-Date/X-Amz-Expires controls.')
  }
  const signedAtUtc = Date.UTC(
    Number(signedAt.slice(0, 4)),
    Number(signedAt.slice(4, 6)) - 1,
    Number(signedAt.slice(6, 8)),
    Number(signedAt.slice(9, 11)),
    Number(signedAt.slice(11, 13)),
    Number(signedAt.slice(13, 15)),
  )
  return signedAtUtc + lifetimeSeconds * 1_000
}

// Also covers PRJ-003 invalid uploads and PRJ-006 cancel/cascade cleanup.
test('PRJ-005: private project documents enforce signed-link security, expiry, and cascade cleanup', async ({ page }) => {
  test.setTimeout(420_000)

  const suffix = uid('doc')
  const categoryCode = uid('E2EDOC').slice(0, 50)
  const projectNumber = uid('E2E-DOC-PRJ').slice(0, 50)
  const projectName = `Document lifecycle project ${suffix}`
  const documentTitle = `Lifecycle document ${suffix}`
  const firstFileName = `lifecycle-v1-${suffix}.pdf`
  const secondFileName = `lifecycle-v2-${suffix}.pdf`
  const firstContent = `%PDF-1.4\nVexorion E2E immutable version one ${suffix}\n%%EOF`
  const secondContent = `%PDF-1.4\nVexorion E2E current version two ${suffix}\n%%EOF`
  const today = new Date().toISOString().slice(0, 10)

  let categoryId: string | null = null
  let projectId: string | null = null
  let documentId: string | null = null

  await page.goto('/')
  const currentUser = expectSuccessfulFixture(await authenticatedApi<{ tenantId: string }>(page, '/auth/me', 'GET'), 'Current tenant')
  const originalUsage = expectSuccessfulFixture(await authenticatedApi<{ usedBytes: number }>(page, `/tenants/${currentUser.tenantId}/storage/summary`, 'GET'), 'Original storage usage')
  expect(originalUsage.usedBytes).toBeGreaterThanOrEqual(0)

  try {
    categoryId = expectSuccessfulFixture(
      await authenticatedApi<CreatedEntity>(page, '/project-categories', 'POST', {
        code: categoryCode,
        name: `E2E Document Lifecycle ${suffix}`,
        description: 'Temporary category for document lifecycle E2E coverage.',
      }),
      'Project category creation',
    ).id

    projectId = expectSuccessfulFixture(
      await authenticatedApi<CreatedEntity>(page, '/projects', 'POST', {
        projectCategoryId: categoryId,
        projectNumber,
        name: projectName,
        governmentAgency: null,
        submissionReference: null,
        startDate: today,
        endDate: null,
        status: 1,
        notes: 'Temporary project for document lifecycle E2E coverage.',
      }),
      'Project creation',
    ).id

    await page.goto(`/projects/${projectId}`)
    await expect(page.getByText(projectName, { exact: true })).toBeVisible()
    await page.getByRole('tab', { name: /^documents$/i }).click()
    const documentsTable = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: /^title$/i }) })
    const historyTable = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: /^uploaded at$/i }) })

    let uploadRequests = 0
    const countUploadRequests = (request: import('@playwright/test').Request) => {
      if (request.method() === 'POST' && request.url().endsWith(`/api/projects/${projectId}/documents/upload`)) uploadRequests += 1
    }
    page.on('request', countUploadRequests)
    await page.getByRole('button', { name: /upload document/i }).click()
    let uploadDialog = page.getByRole('dialog')
    await uploadDialog.getByLabel(/^title$/i).fill(`Cancelled ${documentTitle}`)
    await uploadDialog.locator('input[type="file"]').setInputFiles({
      name: `cancelled-${suffix}.pdf`,
      mimeType: 'application/pdf',
      buffer: Buffer.from(firstContent),
    })
    await uploadDialog.getByRole('button', { name: /^cancel$/i }).click()
    const discardUpload = page.getByRole('dialog', { name: /discard unsaved changes/i })
    await expect(discardUpload).toBeVisible()
    await discardUpload.getByRole('button', { name: /^discard changes$/i }).click()
    await expect(uploadDialog).not.toBeVisible()
    expect(uploadRequests).toBe(0)

    await page.getByRole('button', { name: /upload document/i }).click()
    uploadDialog = page.getByRole('dialog')
    await uploadDialog.getByLabel(/^title$/i).fill(documentTitle)
    await uploadDialog.locator('input[type="file"]').setInputFiles({
      name: `empty-${suffix}.pdf`,
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(0),
    })
    let invalidUploadResponse = page.waitForResponse((response) => (
      response.request().method() === 'POST'
      && response.url().endsWith(`/api/projects/${projectId}/documents/upload`)
    ))
    await uploadDialog.getByRole('button', { name: /upload document/i }).click()
    let invalidUpload = await invalidUploadResponse
    expect(invalidUpload.status()).toBe(400)
    expect(await invalidUpload.json()).toMatchObject({ code: 'document.file_empty' })
    await expect(page.getByText('The uploaded file is empty.', { exact: true })).toBeVisible()

    await uploadDialog.locator('input[type="file"]').setInputFiles({
      name: `mismatched-${suffix}.pdf`,
      mimeType: 'application/pdf',
      buffer: Buffer.from('This is not a PDF file.'),
    })
    invalidUploadResponse = page.waitForResponse((response) => (
      response.request().method() === 'POST'
      && response.url().endsWith(`/api/projects/${projectId}/documents/upload`)
    ))
    await uploadDialog.getByRole('button', { name: /upload document/i }).click()
    invalidUpload = await invalidUploadResponse
    expect(invalidUpload.status()).toBe(400)
    expect(await invalidUpload.json()).toMatchObject({ code: 'document.file_signature_invalid' })
    await expect(page.getByText(/file type is unsupported|contents do not match/i)).toBeVisible()

    await uploadDialog.locator('input[type="file"]').setInputFiles({
      name: firstFileName,
      mimeType: 'application/pdf',
      buffer: Buffer.from(firstContent),
    })

    const uploadResponsePromise = page.waitForResponse((response) => (
      response.request().method() === 'POST'
      && response.url().endsWith(`/api/projects/${projectId}/documents/upload`)
    ))
    await uploadDialog.getByRole('button', { name: /upload document/i }).click()
    const uploadResponse = await uploadResponsePromise
    if (!uploadResponse.ok()) {
      throw new Error(`Document upload returned HTTP ${uploadResponse.status()}: ${await uploadResponse.text()}`)
    }
    const uploadedDocument = (await uploadResponse.json()) as ProjectDocumentUploadResponse
    documentId = uploadedDocument.id
    expect(uploadedDocument.fileName).toBe(firstFileName)

    await expect(page.getByText(/document uploaded/i)).toBeVisible()
    await expect(documentsTable.getByRole('cell', { name: firstFileName, exact: true })).toBeVisible()
    await expect(documentsTable.getByRole('cell', { name: 'v1', exact: true })).toBeVisible()
    await expect(historyTable.getByRole('cell', { name: firstFileName, exact: true })).toBeVisible()
    const originalVersions = expectSuccessfulFixture(
      await authenticatedApi<ProjectDocumentVersion[]>(page, `/projects/${projectId}/documents/${documentId}/versions`, 'GET'),
      'Original document history verification',
    )
    expect(originalVersions).toHaveLength(1)
    expect(originalVersions[0]).toMatchObject({ versionNumber: 1, fileName: firstFileName })
    expect(originalVersions[0].checksum).toBeTruthy()

    await page.getByRole('button', { name: /add version/i }).click()
    const versionDialog = page.getByRole('dialog')
    await versionDialog.getByLabel(/^notes$/i).fill('Second immutable version')
    await versionDialog.locator('input[type="file"]').setInputFiles({
      name: secondFileName,
      mimeType: 'application/pdf',
      buffer: Buffer.from(secondContent),
    })

    let committedVersion: ProjectDocumentVersion | null = null
    const versionRoute = `**/api/projects/${projectId}/documents/${documentId}/versions`
    await page.route(versionRoute, async (route) => {
      if (route.request().method() !== 'POST') { await route.continue(); return }
      const response = await route.fetch()
      if (!response.ok()) { await route.fulfill({ response }); return }
      committedVersion = await response.json() as ProjectDocumentVersion
      await route.abort('failed')
    })
    await versionDialog.getByRole('button', { name: /add version/i }).click()
    await expect(page.getByText(/upload outcome unconfirmed/i)).toBeVisible()
    expect(committedVersion).toMatchObject({ versionNumber: 2, fileName: secondFileName })
    await page.unroute(versionRoute)
    await page.reload()
    await expect(page.getByText(/upload outcome unconfirmed/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /^upload document$/i })).toBeDisabled()
    await page.getByRole('button', { name: /^refresh$/i }).click()
    const discard = page.getByRole('button', { name: /^discard pending attempt$/i })
    await expect(discard).toBeEnabled()
    await discard.click()
    await page.getByRole('dialog').getByRole('button', { name: /^discard pending attempt$/i }).click()
    await expect(page.getByText(/upload outcome unconfirmed/i)).toHaveCount(0)
    await expect(documentsTable.getByRole('cell', { name: secondFileName, exact: true })).toBeVisible()
    await expect(documentsTable.getByRole('cell', { name: firstFileName, exact: true })).toHaveCount(0)
    await expect(documentsTable.getByRole('cell', { name: 'v2', exact: true })).toBeVisible()
    await expect(historyTable.getByRole('cell', { name: firstFileName, exact: true })).toBeVisible()
    await expect(historyTable.getByRole('cell', { name: secondFileName, exact: true })).toBeVisible()
    await expect(historyTable.getByRole('cell', { name: 'v1', exact: true })).toBeVisible()
    await expect(historyTable.getByRole('cell', { name: 'v2', exact: true })).toBeVisible()

    const versions = expectSuccessfulFixture(
      await authenticatedApi<ProjectDocumentVersion[]>(page, `/projects/${projectId}/documents/${documentId}/versions`, 'GET'),
      'Document version history verification',
    )
    expect(versions).toHaveLength(2)
    expect(versions).toEqual(expect.arrayContaining([
      expect.objectContaining({ versionNumber: 1, fileName: firstFileName }),
      expect.objectContaining({ versionNumber: 2, fileName: secondFileName }),
    ]))
    expect(versions.find((version) => version.versionNumber === 1)?.checksum).toBeTruthy()
    expect(versions.find((version) => version.versionNumber === 2)?.checksum).toBeTruthy()
    expect(versions.find((version) => version.versionNumber === 1)).toEqual(originalVersions[0])
    expect(versions.find((version) => version.versionNumber === 2)?.checksum).not.toBe(originalVersions[0].checksum)

    const previewLinkPromise = page.waitForResponse((response) => (
      response.request().method() === 'GET'
      && response.url().endsWith(`/api/projects/${projectId}/documents/${documentId}/download`)
    ))
    await page.getByRole('button', { name: /^preview$/i }).click()
    const previewLinkResponse = await previewLinkPromise
    expect(previewLinkResponse.ok()).toBeTruthy()
    const previewLink = (await previewLinkResponse.json()) as ProjectDocumentDownload
    expect(previewLink).toMatchObject({ fileName: secondFileName, contentType: 'application/pdf' })

    const previewBlob = await page.request.get(previewLink.downloadUrl)
    expect(previewBlob.ok()).toBeTruthy()
    expect((await previewBlob.body()).toString()).toBe(secondContent)

    const downloadLinkPromise = page.waitForResponse((response) => (
      response.request().method() === 'GET'
      && response.url().endsWith(`/api/projects/${projectId}/documents/${documentId}/download`)
    ))
    await page.getByRole('button', { name: /^download$/i }).click()
    const downloadLinkResponse = await downloadLinkPromise
    expect(downloadLinkResponse.ok()).toBeTruthy()
    const downloadLink = (await downloadLinkResponse.json()) as ProjectDocumentDownload
    expect(downloadLink.fileName).toBe(secondFileName)
    expect(downloadLink.fileSizeBytes).toBe(Buffer.byteLength(secondContent))
    const downloadedBlob = await page.request.get(downloadLink.downloadUrl)
    expect(downloadedBlob.ok()).toBeTruthy()
    expect((await downloadedBlob.body()).toString()).toBe(secondContent)

    const anonymous = await playwrightRequest.newContext()
    try {
      const anonymousApi = await anonymous.get(
        `${new URL(page.url()).origin}/api/projects/${projectId}/documents/${documentId}/download`,
      )
      expect(anonymousApi.status()).toBe(401)

      const anonymousRead = await anonymous.get(downloadLink.downloadUrl)
      expect(anonymousRead.ok()).toBeTruthy()
      expect((await anonymousRead.body()).toString()).toBe(secondContent)

      const unsignedObjectUrl = new URL(downloadLink.downloadUrl)
      unsignedObjectUrl.search = ''
      const unsignedRead = await anonymous.get(unsignedObjectUrl.toString())
      // R2's S3 endpoint returns 400 when signing parameters are absent and
      // 401/403 for other anonymous authorization failures.
      expect([400, 401, 403]).toContain(unsignedRead.status())
      const unsignedWrite = await anonymous.put(unsignedObjectUrl.toString(), { data: Buffer.from('forbidden overwrite') })
      expect([400, 401, 403]).toContain(unsignedWrite.status())
      const unsignedDelete = await anonymous.delete(unsignedObjectUrl.toString())
      expect([400, 401, 403]).toContain(unsignedDelete.status())

      const [bucketSegment] = unsignedObjectUrl.pathname.split('/').filter(Boolean)
      expect(bucketSegment).toBeTruthy()
      const unsignedListUrl = `${unsignedObjectUrl.origin}/${bucketSegment}?list-type=2`
      const unsignedList = await anonymous.get(unsignedListUrl)
      expect([400, 401, 403]).toContain(unsignedList.status())

      const signedWrite = await anonymous.put(downloadLink.downloadUrl, { data: Buffer.from('forbidden overwrite') })
      expect([401, 403]).toContain(signedWrite.status())

      const tamperedUrl = new URL(downloadLink.downloadUrl)
      tamperedUrl.searchParams.set('response-content-type', 'text/html')
      const tamperedRead = await anonymous.get(tamperedUrl.toString())
      expect([401, 403]).toContain(tamperedRead.status())

      const expiresAt = getSignedUrlExpiry(downloadLink.downloadUrl)
      const waitForExpiryMs = Math.max(0, expiresAt - Date.now() + 5_000)
      expect(waitForExpiryMs, 'Signed URL lifetime exceeds the seven-minute security-test budget.').toBeLessThan(410_000)
      await page.waitForTimeout(waitForExpiryMs)
      const expiredRead = await anonymous.get(downloadLink.downloadUrl)
      expect([401, 403]).toContain(expiredRead.status())
    } finally {
      await anonymous.dispose()
    }

    await page.getByRole('combobox', { name: /^next status$/i }).click()
    await page.getByRole('option', { name: /^archived$/i }).click()
    await page.getByRole('button', { name: /^apply status$/i }).click()
    await expect(page.getByText(/archived documents are read-only/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /^add version$/i })).toBeDisabled()
    await expect(page.getByRole('button', { name: /^edit metadata$/i })).toBeDisabled()
    await expect(page.getByRole('button', { name: /^preview$/i })).toBeEnabled()
    const retainedUsage = expectSuccessfulFixture(await authenticatedApi<{ usedBytes: number }>(page, `/tenants/${currentUser.tenantId}/storage/summary`, 'GET'), 'Retained version usage')
    expect(retainedUsage.usedBytes).toBe(originalUsage.usedBytes + Buffer.byteLength(firstContent) + Buffer.byteLength(secondContent))
    const freshLink = expectSuccessfulFixture(
      await authenticatedApi<ProjectDocumentDownload>(page, `/projects/${projectId}/documents/${documentId}/download`, 'GET'),
      'Fresh signed link before project cascade deletion',
    )
    const deletion = await authenticatedApi(page, `/projects/${projectId}`, 'DELETE')
    expect(deletion.status).toBeGreaterThanOrEqual(200)
    expect(deletion.status).toBeLessThan(300)
    documentId = null
    projectId = null
    const finalUsage = expectSuccessfulFixture(await authenticatedApi<{ usedBytes: number }>(page, `/tenants/${currentUser.tenantId}/storage/summary`, 'GET'), 'Storage usage after deletion')
    expect(finalUsage.usedBytes).toBe(originalUsage.usedBytes)
    const deletedObject = await page.request.get(freshLink.downloadUrl)
    expect(deletedObject.status()).toBe(404)
    page.off('request', countUploadRequests)
  } finally {
    if (!page.isClosed()) {
      if (documentId && projectId) {
        await authenticatedApi(page, `/projects/${projectId}/documents/${documentId}`, 'DELETE')
      }
      if (projectId) {
        await authenticatedApi(page, `/projects/${projectId}`, 'DELETE')
      }
      if (categoryId) {
        await authenticatedApi(page, `/project-categories/${categoryId}`, 'DELETE')
      }
    }
  }
})
