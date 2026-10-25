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
})
