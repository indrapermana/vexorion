import { VxBox, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTypography } from '@vexorion/ui'
import type { InventoryEffectRow } from '../types/ui/inventoryEffects'

type InventoryEffectPreviewProps = {
  title: string
  productLabel: string
  warehouseLabel: string
  currentLabel: string
  changeLabel: string
  resultingLabel: string
  rows: InventoryEffectRow[]
}

export default function InventoryEffectPreview({ title, productLabel, warehouseLabel, currentLabel, changeLabel, resultingLabel, rows }: InventoryEffectPreviewProps) {
  return (
    <VxBox component="section" aria-label={title} sx={{ minWidth: 0 }}>
      <VxTypography component="h3" variant="subtitle2" sx={{ mb: 1 }}>{title}</VxTypography>
      <VxTableContainer sx={{ maxWidth: '100%' }}>
        <VxTable size="small" sx={{ minWidth: 540 }}>
          <VxTableHead>
            <VxTableRow>
              <VxTableCell>{productLabel}</VxTableCell>
              <VxTableCell>{warehouseLabel}</VxTableCell>
              <VxTableCell align="right">{currentLabel}</VxTableCell>
              <VxTableCell align="right">{changeLabel}</VxTableCell>
              <VxTableCell align="right">{resultingLabel}</VxTableCell>
            </VxTableRow>
          </VxTableHead>
          <VxTableBody>
            {rows.map((row) => (
              <VxTableRow key={row.id}>
                <VxTableCell>{row.product}</VxTableCell>
                <VxTableCell>{row.warehouse}</VxTableCell>
                <VxTableCell align="right">{row.currentQuantity.toFixed(2)}</VxTableCell>
                <VxTableCell align="right">{row.quantityChange > 0 ? '+' : ''}{row.quantityChange.toFixed(2)}</VxTableCell>
                <VxTableCell align="right">{(row.currentQuantity + row.quantityChange).toFixed(2)}</VxTableCell>
              </VxTableRow>
            ))}
            {rows.length === 0 ? (
              <VxTableRow><VxTableCell colSpan={5}><VxTypography color="text.secondary">-</VxTypography></VxTableCell></VxTableRow>
            ) : null}
          </VxTableBody>
        </VxTable>
      </VxTableContainer>
    </VxBox>
  )
}