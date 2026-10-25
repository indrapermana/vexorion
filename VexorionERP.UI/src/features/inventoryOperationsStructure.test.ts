import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(resolve(process.cwd(), 'src/features', path), 'utf8')

describe('inventory operation component boundaries', () => {
  it.each([
    ['inventoryAdjustments/pages/InventoryAdjustmentsPage.tsx', ['InventoryAdjustmentList', 'InventoryAdjustmentDetail', 'InventoryAdjustmentLineEditor']],
    ['stockTransfers/pages/StockTransfersPage.tsx', ['StockTransferList', 'StockTransferDetail', 'StockTransferLineEditor']],
    ['stockCounts/pages/StockCountsPage.tsx', ['StockCountList', 'StockCountDetail', 'StockCountLineEditor']],
  ])('%s delegates list, detail, and line-editor rendering', (path, components) => {
    const page = source(path)

    for (const component of components) {
      expect(page).toContain(`<${component}`)
    }

    expect(page).not.toContain('<VxTable')
  })

  it('keeps stock-count lifecycle actions in a dedicated component', () => {
    const detail = source('stockCounts/components/StockCountDetail.tsx')
    const actions = source('stockCounts/components/StockCountStateActions.tsx')

    expect(detail).toContain('<StockCountStateActions')
    expect(actions).toContain("t('pages.stockCounts.linePanel.post')")
    expect(actions).toContain("t('pages.stockCounts.linePanel.reverse')")
  })

  it.each([
    ['inventoryAdjustments/pages/InventoryAdjustmentsPage.tsx', 'inventoryAdjustments/components/InventoryAdjustmentStateActions.tsx', 'InventoryAdjustmentStateActions'],
    ['stockTransfers/pages/StockTransfersPage.tsx', 'stockTransfers/components/StockTransferStateActions.tsx', 'StockTransferStateActions'],
  ])('%s delegates delete confirmation to its state-action component', (pagePath, actionsPath, componentName) => {
    const page = source(pagePath)
    const actions = source(actionsPath)

    expect(page).toContain(`<${componentName}`)
    expect(actions).toContain('<VxConfirmActionDialog')
  })

  it('shows posting effects before adjustment and transfer status changes', () => {
    expect(source('inventoryAdjustments/pages/InventoryAdjustmentsPage.tsx')).toContain('<InventoryEffectPreview')
    expect(source('stockTransfers/pages/StockTransfersPage.tsx')).toContain('<InventoryEffectPreview')
  })

  it('includes stock effects in count post and reverse confirmations', () => {
    const page = source('stockCounts/pages/StockCountsPage.tsx')
    expect(page).toContain('details={<InventoryEffectPreview')
    expect(page).toContain("getCountEffectRows(4)")
    expect(page).toContain("getCountEffectRows(5)")
  })

  it.each([
    ['inventoryAdjustments/components/InventoryAdjustmentList.tsx', 'pages.inventoryAdjustments.table.deleteLocked'],
    ['stockTransfers/components/StockTransferList.tsx', 'pages.stockTransfers.table.deleteLocked'],
    ['stockCounts/components/StockCountList.tsx', 'pages.stockCounts.table.deleteLocked'],
  ])('disables deletion outside Draft in %s', (path, explanationKey) => {
    const list = source(path)
    expect(list).toContain('disabled={row.status !== inventoryDocumentStatus.draft}')
    expect(list).toContain(explanationKey)
  })

  it.each([
    ['inventoryAdjustments/pages/InventoryAdjustmentsPage.tsx', 'pages.inventoryAdjustments.statusActions'],
    ['stockTransfers/pages/StockTransfersPage.tsx', 'pages.stockTransfers.statusActions'],
  ])('confirms status changes and shows their effects in %s', (path, actionCopyKey) => {
    const page = source(path)
    expect(page).toContain('getAllowedInventoryDocumentStatuses')
    expect(page).toContain('<VxConfirmActionDialog open={statusConfirmationOpen}')
    expect(page).toContain(actionCopyKey)
    expect(page).toContain('details={')
  })

  it('keeps stock-count status changes in confirmed lifecycle actions', () => {
    const page = source('stockCounts/pages/StockCountsPage.tsx')
    expect(page).not.toContain("label={t('pages.stockCounts.editor.status')}")
    expect(page).toContain('disabled={editorLoading || headerLocked}')
    expect(page).toContain("t('pages.stockCounts.actions.postTitle')")
    expect(page).toContain("t('pages.stockCounts.actions.reverseTitle')")
  })
})
