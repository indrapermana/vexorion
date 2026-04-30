import { useState } from 'react'
import { Box, Tab, Tabs } from '@mui/material'
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
    <Box>
      <Tabs
        value={tab}
        onChange={(_, value: number) => setTab(value)}
        sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={t('components.products.grid.tabs.stock')} />
        <Tab label={t('components.products.grid.tabs.identifiers')} />
      </Tabs>
      {tab === 0 && <ProductStockPanel row={row} />}
      {tab === 1 && <ProductIdentifiersPanel productId={row.id} />}
    </Box>
  )
}
