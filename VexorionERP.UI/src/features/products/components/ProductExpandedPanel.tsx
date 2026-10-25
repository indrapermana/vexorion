import { useState } from 'react'
import { VxBox, VxTab, VxTabs } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { ProductGridRow } from '../../../types/ui'
import ProductIdentifiersPanel from './ProductIdentifiersPanel'
import ProductStockPanel from './ProductStockPanel'
import ProductDetailsPanel from './ProductDetailsPanel'
import ProductPurchaseHistoryPanel from './ProductPurchaseHistoryPanel'

type ProductExpandedPanelProps = {
  row: ProductGridRow
  canManage?: boolean
  onEdit: (productId: string) => void
}

export default function ProductExpandedPanel({ row, canManage = true, onEdit }: ProductExpandedPanelProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState(0)

  return (
    <VxBox>
      <VxTabs
        value={tab}
        onChange={(_, value: number) => setTab(value)}
        sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <VxTab label={t('components.products.grid.tabs.details')} />
        <VxTab label={t('components.products.grid.tabs.stock')} />
        <VxTab label={t('components.products.grid.tabs.identifiers')} />
        <VxTab label={t('components.products.grid.tabs.purchaseHistory')} />
      </VxTabs>
      {tab === 0 && <ProductDetailsPanel row={row} canManage={canManage} onEdit={onEdit} />}
      {tab === 1 && <ProductStockPanel row={row} />}
      {tab === 2 && <ProductIdentifiersPanel productId={row.id} canManage={canManage} />}
      {tab === 3 && <ProductPurchaseHistoryPanel productId={row.id} />}
    </VxBox>
  )
}
