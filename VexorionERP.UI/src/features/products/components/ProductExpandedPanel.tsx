import { useState } from 'react'
import { VxBox, VxTab, VxTabs } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { ProductGridRow } from '../../../types/ui'
import ProductIdentifiersPanel from './ProductIdentifiersPanel'
import ProductStockPanel from './ProductStockPanel'

type ProductExpandedPanelProps = {
  row: ProductGridRow
}

export default function ProductExpandedPanel({ row }: ProductExpandedPanelProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState(0)

  return (
    <VxBox>
      <VxTabs
        value={tab}
        onChange={(_, value: number) => setTab(value)}
        sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <VxTab label={t('components.products.grid.tabs.stock')} />
        <VxTab label={t('components.products.grid.tabs.identifiers')} />
      </VxTabs>
      {tab === 0 && <ProductStockPanel row={row} />}
      {tab === 1 && <ProductIdentifiersPanel productId={row.id} />}
    </VxBox>
  )
}
