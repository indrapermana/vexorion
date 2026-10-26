/**
 * Project document lifecycle E2E coverage.
 *
 * Creates disposable project fixtures through authenticated APIs, then uses
 * the browser UI for upload, versioning, preview, and download operations.
 */
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

test('P1-1: upload, version, preview, download, and preserve document history', async ({ page }) => {
  test.setTimeout(90_000)

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
    await page.getByRole('button', { name: /upload document/i }).click()

    const uploadDialog = page.getByRole('dialog')
    await uploadDialog.getByLabel(/^title$/i).fill(documentTitle)
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

    const versionResponsePromise = page.waitForResponse((response) => (
      response.request().method() === 'POST'
      && response.url().endsWith(`/api/projects/${projectId}/documents/${documentId}/versions`)
    ))
    await versionDialog.getByRole('button', { name: /add version/i }).click()
    const versionResponse = await versionResponsePromise
    if (!versionResponse.ok()) {
      throw new Error(`Version upload returned HTTP ${versionResponse.status()}: ${await versionResponse.text()}`)
    }
    const uploadedVersion = (await versionResponse.json()) as ProjectDocumentVersion
    expect(uploadedVersion).toMatchObject({ versionNumber: 2, fileName: secondFileName })

    await expect(page.getByText(/new version uploaded/i)).toBeVisible()
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
