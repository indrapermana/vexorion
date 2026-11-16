/**
 * Persisted inventory lifecycle and reconciliation coverage.
 *
 * Covers regression cases INV-001 through INV-007 and INV-011 against the
 * isolated automation tenant. These scenarios deliberately assert API state,
 * signed movement history, and balances rather than only checking UI controls.
 */
import { authenticatedApi, expectSuccessfulFixture, type CreatedEntity } from './api-helpers'
import { expect, test, uid } from './fixtures'
import { randomUUID } from 'node:crypto'

const DRAFT = 1
const COMPLETED = 4
const CANCELLED = 5
const today = new Date().toISOString().slice(0, 10)

type InventoryLine = CreatedEntity & {
  productId: string
}

type InventoryDocument = CreatedEntity & {
  status: number
  lines: InventoryLine[]
}

type InventoryBalance = CreatedEntity & {
  productId: string
  warehouseId: string
  quantityOnHand: number
  quantityReserved: number
  quantityAvailable: number
}

type InventoryMovement = {
  movementType: string
  productId: string
  warehouseId: string
  quantityOnHandDelta: number
  quantityReservedDelta: number
  referenceNumber: string
  sourceDocumentId: string | null
}

type MovementAudit = {
  totalCount: number
  items: InventoryMovement[]
}

type Fixture = {
  productId: string
  sourceWarehouseId: string
  destinationWarehouseId: string
}

function number(prefix: string) {
  return uid(prefix).replace(/[^a-z0-9-]/gi, '').slice(0, 50).toUpperCase()
}

async function createProduct(page: Parameters<typeof authenticatedApi>[0], label = 'Lifecycle') {
  const suffix = `${number('INV').slice(-8)}-${randomUUID().slice(0, 8)}`
  return expectSuccessfulFixture(
    await authenticatedApi<CreatedEntity>(page, '/products', 'POST', {
      sku: `SKU-${suffix}`,
      name: `${label} product ${suffix}`,
      unitOfMeasure: 'EA',
      standardCost: 10,
      salesPrice: 15,
      reorderLevel: 2,
    }),
    `${label} inventory product creation`,
  ).id
}

async function createFixture(page: Parameters<typeof authenticatedApi>[0]): Promise<Fixture> {
  const suffix = `${number('INV').slice(-8)}-${randomUUID().slice(0, 8)}`
  const productId = await createProduct(page)
  const sourceWarehouseId = expectSuccessfulFixture(
    await authenticatedApi<CreatedEntity>(page, '/warehouses', 'POST', {
      code: `S${suffix}`.slice(0, 50),
      name: `Lifecycle source ${suffix}`,
      locationDescription: 'Disposable inventory lifecycle fixture',
    }),
    'Inventory lifecycle source warehouse creation',
  ).id
  const destinationWarehouseId = expectSuccessfulFixture(
    await authenticatedApi<CreatedEntity>(page, '/warehouses', 'POST', {
      code: `D${suffix}`.slice(0, 50),
      name: `Lifecycle destination ${suffix}`,
      locationDescription: 'Disposable inventory lifecycle fixture',
    }),
    'Inventory lifecycle destination warehouse creation',
  ).id

  return { productId, sourceWarehouseId, destinationWarehouseId }
}

async function createBalance(
  page: Parameters<typeof authenticatedApi>[0],
  productId: string,
  warehouseId: string,
  quantityOnHand: number,
) {
  return expectSuccessfulFixture(
    await authenticatedApi<InventoryBalance>(page, '/inventory-balances', 'POST', {
      productId,
      warehouseId,
      quantityOnHand,
      quantityReserved: 0,
    }),
    'Opening inventory balance creation',
  )
}

async function getBalance(
  page: Parameters<typeof authenticatedApi>[0],
  productId: string,
  warehouseId: string,
) {
  const balances = expectSuccessfulFixture(
    await authenticatedApi<InventoryBalance[]>(page, '/inventory-balances', 'GET'),
    'Inventory balance query',
  )
  const balance = balances.find((item) => item.productId === productId && item.warehouseId === warehouseId)
  expect(balance, `Balance not found for product ${productId} and warehouse ${warehouseId}`).toBeDefined()
  return balance as InventoryBalance
}

async function getMovements(
  page: Parameters<typeof authenticatedApi>[0],
  productId: string,
  referenceNumber: string,
) {
  const audit = expectSuccessfulFixture(
    await authenticatedApi<MovementAudit>(
      page,
      `/inventory-reports/movement-audit?productId=${productId}&take=100`,
      'GET',
    ),
    'Inventory movement audit query',
  )
  return audit.items.filter((item) => item.referenceNumber === referenceNumber)
}

function sumOnHand(movements: InventoryMovement[], warehouseId?: string) {
  return movements
    .filter((movement) => warehouseId === undefined || movement.warehouseId === warehouseId)
    .reduce((sum, movement) => sum + movement.quantityOnHandDelta, 0)
}

function expectSuccessfulStatus(result: { status: number; body: unknown }, operation: string) {
  expect(result.status, `${operation} failed: ${JSON.stringify(result.body)}`).toBeGreaterThanOrEqual(200)
  expect(result.status, `${operation} failed: ${JSON.stringify(result.body)}`).toBeLessThan(300)
}

test('INV-001/002/007/011: adjustment posts once, is immutable, reverses once, and reconciles', async ({ page }) => {
  const fixture = await createFixture(page)
  const opening = 20
  await createBalance(page, fixture.productId, fixture.sourceWarehouseId, opening)
  const adjustmentNumber = number('ADJ-LIFE')
  const adjustment = expectSuccessfulFixture(
    await authenticatedApi<InventoryDocument>(page, '/inventory-adjustments', 'POST', {
      adjustmentNumber,
      warehouseId: fixture.sourceWarehouseId,
      adjustmentDate: today,
      reason: 'Lifecycle reconciliation test',
      notes: 'Disposable E2E document',
    }),
    'Inventory adjustment creation',
  )
  expect(adjustment.status).toBe(DRAFT)
  const line = expectSuccessfulFixture(
    await authenticatedApi<InventoryLine>(page, `/inventory-adjustments/${adjustment.id}/lines`, 'POST', {
      productId: fixture.productId,
      quantityDelta: 7,
      unitCost: 10,
      reason: 'Automated lifecycle increase',
    }),
    'Inventory adjustment line creation',
  )

  const draftNumber = number('ADJ-DRAFT-CANCEL')
  const draft = expectSuccessfulFixture(
    await authenticatedApi<InventoryDocument>(page, '/inventory-adjustments', 'POST', {
      adjustmentNumber: draftNumber,
      warehouseId: fixture.sourceWarehouseId,
      adjustmentDate: today,
      reason: 'Draft cancellation test',
    }),
    'Draft adjustment creation',
  )
  const draftLine = expectSuccessfulFixture(
    await authenticatedApi<InventoryLine>(page, `/inventory-adjustments/${draft.id}/lines`, 'POST', {
      productId: fixture.productId,
      quantityDelta: 2,
      unitCost: 10,
      reason: 'Draft mutation test',
    }),
    'Draft adjustment line creation',
  )
  expectSuccessfulFixture(
    await authenticatedApi<InventoryLine>(page, `/inventory-adjustments/${draft.id}/lines/${draftLine.id}`, 'PUT', {
      productId: fixture.productId,
      quantityDelta: 3,
      unitCost: 10,
      reason: 'Draft line update succeeds',
    }),
    'Draft adjustment line update',
  )
  expectSuccessfulFixture(
    await authenticatedApi<InventoryDocument>(page, `/inventory-adjustments/${draft.id}`, 'PUT', {
      adjustmentNumber: draftNumber,
      warehouseId: fixture.sourceWarehouseId,
      adjustmentDate: today,
      status: CANCELLED,
      reason: 'Draft cancellation test',
    }),
    'Draft adjustment cancellation',
  )
  expect(await getMovements(page, fixture.productId, draftNumber)).toHaveLength(0)
  expect((await getBalance(page, fixture.productId, fixture.sourceWarehouseId)).quantityOnHand).toBe(opening)

  const deletableNumber = number('ADJ-DRAFT-DELETE')
  const deletable = expectSuccessfulFixture(
    await authenticatedApi<InventoryDocument>(page, '/inventory-adjustments', 'POST', {
      adjustmentNumber: deletableNumber,
      warehouseId: fixture.sourceWarehouseId,
      adjustmentDate: today,
      reason: 'Draft deletion test',
    }),
    'Deletable draft adjustment creation',
  )
  const deletableLine = expectSuccessfulFixture(
    await authenticatedApi<InventoryLine>(page, `/inventory-adjustments/${deletable.id}/lines`, 'POST', {
      productId: fixture.productId,
      quantityDelta: 1,
      unitCost: 10,
      reason: 'Draft deletion test',
    }),
    'Deletable draft adjustment line creation',
  )
  expectSuccessfulStatus(
    await authenticatedApi(page, `/inventory-adjustments/${deletable.id}/lines/${deletableLine.id}`, 'DELETE'),
    'Draft adjustment line deletion',
  )
  expectSuccessfulStatus(
    await authenticatedApi(page, `/inventory-adjustments/${deletable.id}`, 'DELETE'),
    'Draft adjustment deletion',
  )

  expect((await getBalance(page, fixture.productId, fixture.sourceWarehouseId)).quantityOnHand).toBe(opening)
  expect(await getMovements(page, fixture.productId, adjustmentNumber)).toHaveLength(0)

  const completed = expectSuccessfulFixture(
    await authenticatedApi<InventoryDocument>(page, `/inventory-adjustments/${adjustment.id}`, 'PUT', {
      adjustmentNumber,
      warehouseId: fixture.sourceWarehouseId,
      adjustmentDate: today,
      status: COMPLETED,
      reason: 'Lifecycle reconciliation test',
      notes: 'Disposable E2E document',
    }),
    'Inventory adjustment completion',
  )
  expect(completed.status).toBe(COMPLETED)
  expect((await getBalance(page, fixture.productId, fixture.sourceWarehouseId)).quantityOnHand).toBe(opening + 7)
  const posted = await getMovements(page, fixture.productId, adjustmentNumber)
  expect(posted).toHaveLength(1)
  expect(sumOnHand(posted)).toBe(7)
  expect(posted[0]).toEqual(expect.objectContaining({ referenceNumber: adjustmentNumber }))

  const lineUpdate = await authenticatedApi(
    page,
    `/inventory-adjustments/${adjustment.id}/lines/${line.id}`,
    'PUT',
    { productId: fixture.productId, quantityDelta: 99, unitCost: 10, reason: 'Must be rejected' },
  )
  expect(lineUpdate.status).toBe(409)
  const lineDelete = await authenticatedApi(
    page,
    `/inventory-adjustments/${adjustment.id}/lines/${line.id}`,
    'DELETE',
  )
  expect(lineDelete.status).toBe(409)
  const documentDelete = await authenticatedApi(page, `/inventory-adjustments/${adjustment.id}`, 'DELETE')
  expect(documentDelete.status).toBe(409)
  expect((await getBalance(page, fixture.productId, fixture.sourceWarehouseId)).quantityOnHand).toBe(opening + 7)
  expect(await getMovements(page, fixture.productId, adjustmentNumber)).toHaveLength(1)

  const cancelled = expectSuccessfulFixture(
    await authenticatedApi<InventoryDocument>(page, `/inventory-adjustments/${adjustment.id}`, 'PUT', {
      adjustmentNumber,
      warehouseId: fixture.sourceWarehouseId,
      adjustmentDate: today,
      status: CANCELLED,
      reason: 'Lifecycle reconciliation test',
      notes: 'Disposable E2E document',
    }),
    'Inventory adjustment cancellation',
  )
  expect(cancelled.status).toBe(CANCELLED)
  expect((await getBalance(page, fixture.productId, fixture.sourceWarehouseId)).quantityOnHand).toBe(opening)
  const reversed = await getMovements(page, fixture.productId, adjustmentNumber)
  expect(reversed).toHaveLength(2)
  expect(sumOnHand(reversed)).toBe(0)
  expect((await authenticatedApi(
    page,
    `/inventory-adjustments/${adjustment.id}/lines/${line.id}`,
    'PUT',
    { productId: fixture.productId, quantityDelta: 1, unitCost: 10, reason: 'Must remain rejected' },
  )).status).toBe(409)
  expect((await authenticatedApi(page, `/inventory-adjustments/${adjustment.id}`, 'DELETE')).status).toBe(409)

  const repeatedCancellation = await authenticatedApi(
    page,
    `/inventory-adjustments/${adjustment.id}`,
    'PUT',
    {
      adjustmentNumber,
      warehouseId: fixture.sourceWarehouseId,
      adjustmentDate: today,
      status: CANCELLED,
      reason: 'Lifecycle reconciliation test',
      notes: 'Disposable E2E document',
    },
  )
  expect(repeatedCancellation.status).toBeGreaterThanOrEqual(200)
  expect(repeatedCancellation.status).toBeLessThan(300)
  expect((await getBalance(page, fixture.productId, fixture.sourceWarehouseId)).quantityOnHand).toBe(opening)
  expect(await getMovements(page, fixture.productId, adjustmentNumber)).toHaveLength(2)
})

test('INV-003/004/007/011: stock count posts variance, guards lines, and compensates cancellation', async ({ page }) => {
  const fixture = await createFixture(page)
  const matchingProductId = await createProduct(page, 'Matching count')
  const gainingProductId = await createProduct(page, 'Gaining count')
  const opening = 15
  const counted = 11
  const matchingOpening = 10
  const gainingOpening = 10
  const gainingCounted = 13
  await createBalance(page, fixture.productId, fixture.sourceWarehouseId, opening)
  await createBalance(page, matchingProductId, fixture.sourceWarehouseId, matchingOpening)
  await createBalance(page, gainingProductId, fixture.sourceWarehouseId, gainingOpening)
  const countNumber = number('COUNT-LIFE')
  const stockCount = expectSuccessfulFixture(
    await authenticatedApi<InventoryDocument>(page, '/stock-counts', 'POST', {
      countNumber,
      warehouseId: fixture.sourceWarehouseId,
      countDate: today,
      notes: 'Disposable stock-count E2E document',
    }),
    'Stock count creation',
  )
  expect(stockCount.status).toBe(DRAFT)
  const line = expectSuccessfulFixture(
    await authenticatedApi<InventoryLine>(page, `/stock-counts/${stockCount.id}/lines`, 'POST', {
      productId: fixture.productId,
      systemQuantity: opening,
      countedQuantity: counted,
    }),
    'Stock count line creation',
  )
  expectSuccessfulFixture(
    await authenticatedApi<InventoryLine>(page, `/stock-counts/${stockCount.id}/lines`, 'POST', {
      productId: matchingProductId,
      systemQuantity: matchingOpening,
      countedQuantity: matchingOpening,
    }),
    'Matching stock count line creation',
  )
  expectSuccessfulFixture(
    await authenticatedApi<InventoryLine>(page, `/stock-counts/${stockCount.id}/lines`, 'POST', {
      productId: gainingProductId,
      systemQuantity: gainingOpening,
      countedQuantity: gainingCounted,
    }),
    'Gaining stock count line creation',
  )

  const draftCountNumber = number('COUNT-DRAFT-CANCEL')
  const draftCount = expectSuccessfulFixture(
    await authenticatedApi<InventoryDocument>(page, '/stock-counts', 'POST', {
      countNumber: draftCountNumber,
      warehouseId: fixture.sourceWarehouseId,
      countDate: today,
      notes: 'Draft count cancellation test',
    }),
    'Draft stock count creation',
  )
  const draftCountLine = expectSuccessfulFixture(
    await authenticatedApi<InventoryLine>(page, `/stock-counts/${draftCount.id}/lines`, 'POST', {
      productId: fixture.productId,
      systemQuantity: opening,
      countedQuantity: opening + 2,
    }),
    'Draft stock count line creation',
  )
  expectSuccessfulFixture(
    await authenticatedApi<InventoryLine>(page, `/stock-counts/${draftCount.id}/lines/${draftCountLine.id}`, 'PUT', {
      productId: fixture.productId,
      systemQuantity: opening,
      countedQuantity: opening + 3,
    }),
    'Draft stock count line update',
  )
  expectSuccessfulFixture(
    await authenticatedApi<InventoryDocument>(page, `/stock-counts/${draftCount.id}`, 'PUT', {
      countNumber: draftCountNumber,
      warehouseId: fixture.sourceWarehouseId,
      countDate: today,
      status: CANCELLED,
      notes: 'Draft count cancellation test',
    }),
    'Draft stock count cancellation',
  )
  expect(await getMovements(page, fixture.productId, draftCountNumber)).toHaveLength(0)

  const deletableCountNumber = number('COUNT-DRAFT-DELETE')
  const deletableCount = expectSuccessfulFixture(
    await authenticatedApi<InventoryDocument>(page, '/stock-counts', 'POST', {
      countNumber: deletableCountNumber,
      warehouseId: fixture.sourceWarehouseId,
      countDate: today,
      notes: 'Draft count deletion test',
    }),
    'Deletable draft stock count creation',
  )
  const deletableCountLine = expectSuccessfulFixture(
    await authenticatedApi<InventoryLine>(page, `/stock-counts/${deletableCount.id}/lines`, 'POST', {
      productId: fixture.productId,
      systemQuantity: opening,
      countedQuantity: opening,
    }),
    'Deletable draft stock count line creation',
  )
  expectSuccessfulStatus(
    await authenticatedApi(page, `/stock-counts/${deletableCount.id}/lines/${deletableCountLine.id}`, 'DELETE'),
    'Draft stock count line deletion',
  )
  expectSuccessfulStatus(
    await authenticatedApi(page, `/stock-counts/${deletableCount.id}`, 'DELETE'),
    'Draft stock count deletion',
  )

  expect((await getBalance(page, fixture.productId, fixture.sourceWarehouseId)).quantityOnHand).toBe(opening)
  expect(await getMovements(page, fixture.productId, countNumber)).toHaveLength(0)

  expectSuccessfulFixture(
    await authenticatedApi<InventoryDocument>(page, `/stock-counts/${stockCount.id}`, 'PUT', {
      countNumber,
      warehouseId: fixture.sourceWarehouseId,
      countDate: today,
      status: COMPLETED,
      notes: 'Disposable stock-count E2E document',
    }),
    'Stock count completion',
  )
  expect((await getBalance(page, fixture.productId, fixture.sourceWarehouseId)).quantityOnHand).toBe(counted)
  expect((await getBalance(page, matchingProductId, fixture.sourceWarehouseId)).quantityOnHand).toBe(matchingOpening)
  expect((await getBalance(page, gainingProductId, fixture.sourceWarehouseId)).quantityOnHand).toBe(gainingCounted)
  const posted = await getMovements(page, fixture.productId, countNumber)
  expect(posted).toHaveLength(1)
  expect(sumOnHand(posted)).toBe(counted - opening)
  expect(await getMovements(page, matchingProductId, countNumber)).toHaveLength(0)
  const gainMovements = await getMovements(page, gainingProductId, countNumber)
  expect(gainMovements).toHaveLength(1)
  expect(sumOnHand(gainMovements)).toBe(gainingCounted - gainingOpening)

  const lineUpdate = await authenticatedApi(
    page,
    `/stock-counts/${stockCount.id}/lines/${line.id}`,
    'PUT',
    { productId: fixture.productId, systemQuantity: opening, countedQuantity: 100 },
  )
  expect(lineUpdate.status).toBe(409)
  expect((await authenticatedApi(page, `/stock-counts/${stockCount.id}/lines/${line.id}`, 'DELETE')).status).toBe(409)
  expect((await authenticatedApi(page, `/stock-counts/${stockCount.id}`, 'DELETE')).status).toBe(409)

  expectSuccessfulFixture(
    await authenticatedApi<InventoryDocument>(page, `/stock-counts/${stockCount.id}`, 'PUT', {
      countNumber,
      warehouseId: fixture.sourceWarehouseId,
      countDate: today,
      status: CANCELLED,
      notes: 'Disposable stock-count E2E document',
    }),
    'Stock count cancellation',
  )
  expect((await getBalance(page, fixture.productId, fixture.sourceWarehouseId)).quantityOnHand).toBe(opening)
  const reversed = await getMovements(page, fixture.productId, countNumber)
  expect(reversed).toHaveLength(2)
  expect(sumOnHand(reversed)).toBe(0)
  expect((await getBalance(page, matchingProductId, fixture.sourceWarehouseId)).quantityOnHand).toBe(matchingOpening)
  expect((await getBalance(page, gainingProductId, fixture.sourceWarehouseId)).quantityOnHand).toBe(gainingOpening)
  expect((await authenticatedApi(
    page,
    `/stock-counts/${stockCount.id}/lines/${line.id}`,
    'PUT',
    { productId: fixture.productId, systemQuantity: opening, countedQuantity: opening },
  )).status).toBe(409)
  expect((await authenticatedApi(page, `/stock-counts/${stockCount.id}`, 'DELETE')).status).toBe(409)
})

test('INV-005/006/007/011: transfer posts both legs, rejects shortages, and reverses atomically', async ({ page }) => {
  const fixture = await createFixture(page)
  const sourceOpening = 25
  const destinationOpening = 3
  const transferQuantity = 8
  await createBalance(page, fixture.productId, fixture.sourceWarehouseId, sourceOpening)
  await createBalance(page, fixture.productId, fixture.destinationWarehouseId, destinationOpening)
  const transferNumber = number('TRF-LIFE')
  const transfer = expectSuccessfulFixture(
    await authenticatedApi<InventoryDocument>(page, '/stock-transfers', 'POST', {
      transferNumber,
      sourceWarehouseId: fixture.sourceWarehouseId,
      destinationWarehouseId: fixture.destinationWarehouseId,
      transferDate: today,
      notes: 'Disposable transfer E2E document',
    }),
    'Stock transfer creation',
  )
  expect(transfer.status).toBe(DRAFT)
  const line = expectSuccessfulFixture(
    await authenticatedApi<InventoryLine>(page, `/stock-transfers/${transfer.id}/lines`, 'POST', {
      productId: fixture.productId,
      quantity: transferQuantity,
      unitCost: 10,
    }),
    'Stock transfer line creation',
  )

  const deletableTransferNumber = number('TRF-DRAFT-DELETE')
  const deletableTransfer = expectSuccessfulFixture(
    await authenticatedApi<InventoryDocument>(page, '/stock-transfers', 'POST', {
      transferNumber: deletableTransferNumber,
      sourceWarehouseId: fixture.sourceWarehouseId,
      destinationWarehouseId: fixture.destinationWarehouseId,
      transferDate: today,
      notes: 'Draft transfer mutation test',
    }),
    'Deletable draft stock transfer creation',
  )
  const deletableTransferLine = expectSuccessfulFixture(
    await authenticatedApi<InventoryLine>(page, `/stock-transfers/${deletableTransfer.id}/lines`, 'POST', {
      productId: fixture.productId,
      quantity: 2,
      unitCost: 10,
    }),
    'Deletable draft stock transfer line creation',
  )
  expectSuccessfulFixture(
    await authenticatedApi<InventoryLine>(
      page,
      `/stock-transfers/${deletableTransfer.id}/lines/${deletableTransferLine.id}`,
      'PUT',
      { productId: fixture.productId, quantity: 3, unitCost: 10 },
    ),
    'Draft stock transfer line update',
  )
  expectSuccessfulStatus(
    await authenticatedApi(page, `/stock-transfers/${deletableTransfer.id}/lines/${deletableTransferLine.id}`, 'DELETE'),
    'Draft stock transfer line deletion',
  )
  expectSuccessfulStatus(
    await authenticatedApi(page, `/stock-transfers/${deletableTransfer.id}`, 'DELETE'),
    'Draft stock transfer deletion',
  )

  expectSuccessfulFixture(
    await authenticatedApi<InventoryDocument>(page, `/stock-transfers/${transfer.id}`, 'PUT', {
      transferNumber,
      sourceWarehouseId: fixture.sourceWarehouseId,
      destinationWarehouseId: fixture.destinationWarehouseId,
      transferDate: today,
      status: COMPLETED,
      notes: 'Disposable transfer E2E document',
    }),
    'Stock transfer completion',
  )
  expect((await getBalance(page, fixture.productId, fixture.sourceWarehouseId)).quantityOnHand)
    .toBe(sourceOpening - transferQuantity)
  expect((await getBalance(page, fixture.productId, fixture.destinationWarehouseId)).quantityOnHand)
    .toBe(destinationOpening + transferQuantity)
  const posted = await getMovements(page, fixture.productId, transferNumber)
  expect(posted).toHaveLength(2)
  expect(sumOnHand(posted, fixture.sourceWarehouseId)).toBe(-transferQuantity)
  expect(sumOnHand(posted, fixture.destinationWarehouseId)).toBe(transferQuantity)
  expect(sumOnHand(posted)).toBe(0)

  expect((await authenticatedApi(
    page,
    `/stock-transfers/${transfer.id}/lines/${line.id}`,
    'PUT',
    { productId: fixture.productId, quantity: 1, unitCost: 10 },
  )).status).toBe(409)
  expect((await authenticatedApi(page, `/stock-transfers/${transfer.id}/lines/${line.id}`, 'DELETE')).status).toBe(409)
  expect((await authenticatedApi(page, `/stock-transfers/${transfer.id}`, 'DELETE')).status).toBe(409)

  expectSuccessfulFixture(
    await authenticatedApi<InventoryDocument>(page, `/stock-transfers/${transfer.id}`, 'PUT', {
      transferNumber,
      sourceWarehouseId: fixture.sourceWarehouseId,
      destinationWarehouseId: fixture.destinationWarehouseId,
      transferDate: today,
      status: CANCELLED,
      notes: 'Disposable transfer E2E document',
    }),
    'Stock transfer cancellation',
  )
  expect((await getBalance(page, fixture.productId, fixture.sourceWarehouseId)).quantityOnHand).toBe(sourceOpening)
  expect((await getBalance(page, fixture.productId, fixture.destinationWarehouseId)).quantityOnHand).toBe(destinationOpening)
  const reversed = await getMovements(page, fixture.productId, transferNumber)
  expect(reversed).toHaveLength(4)
  expect(sumOnHand(reversed, fixture.sourceWarehouseId)).toBe(0)
  expect(sumOnHand(reversed, fixture.destinationWarehouseId)).toBe(0)
  expect((await authenticatedApi(
    page,
    `/stock-transfers/${transfer.id}/lines/${line.id}`,
    'PUT',
    { productId: fixture.productId, quantity: 1, unitCost: 10 },
  )).status).toBe(409)
  expect((await authenticatedApi(page, `/stock-transfers/${transfer.id}`, 'DELETE')).status).toBe(409)

  const shortageNumber = number('TRF-SHORT')
  const shortage = expectSuccessfulFixture(
    await authenticatedApi<InventoryDocument>(page, '/stock-transfers', 'POST', {
      transferNumber: shortageNumber,
      sourceWarehouseId: fixture.sourceWarehouseId,
      destinationWarehouseId: fixture.destinationWarehouseId,
      transferDate: today,
      notes: 'Expected insufficient-stock rejection',
    }),
    'Shortage stock transfer creation',
  )
  expect(shortage.status).toBe(DRAFT)
  expectSuccessfulFixture(
    await authenticatedApi<InventoryLine>(page, `/stock-transfers/${shortage.id}/lines`, 'POST', {
      productId: fixture.productId,
      quantity: sourceOpening + 1,
      unitCost: 10,
    }),
    'Shortage stock transfer line creation',
  )
  const shortageResult = await authenticatedApi(
    page,
    `/stock-transfers/${shortage.id}`,
    'PUT',
    {
      transferNumber: shortageNumber,
      sourceWarehouseId: fixture.sourceWarehouseId,
      destinationWarehouseId: fixture.destinationWarehouseId,
      transferDate: today,
      status: COMPLETED,
      notes: 'Expected insufficient-stock rejection',
    },
  )
  expect(shortageResult.status).toBe(409)
  expect(JSON.stringify(shortageResult.body)).toMatch(/insufficient.*stock/i)
  expect((await getBalance(page, fixture.productId, fixture.sourceWarehouseId)).quantityOnHand).toBe(sourceOpening)
  expect((await getBalance(page, fixture.productId, fixture.destinationWarehouseId)).quantityOnHand).toBe(destinationOpening)
  expect(await getMovements(page, fixture.productId, shortageNumber)).toHaveLength(0)
})
