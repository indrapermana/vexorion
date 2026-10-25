import { DeleteOutlineRoundedIcon, EditRoundedIcon, FormatListBulletedRoundedIcon } from '@vexorion/ui'
import { VxBox, VxButton, VxCircularProgress, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { InventoryAdjustmentListItemResponse } from '../../../types/api'

export type InventoryAdjustmentListRow = InventoryAdjustmentListItemResponse & { warehouseName?: string }

type Props = {
  rows: InventoryAdjustmentListRow[]
  loading: boolean
  selectedId?: string
  canManage: boolean
  getStatusLabel: (status: number) => string
  onSelect: (id: string) => void
  onEdit: (row: InventoryAdjustmentListRow) => void
  onDelete: (row: InventoryAdjustmentListRow) => void
}

export default function InventoryAdjustmentList({ rows, loading, selectedId, canManage, getStatusLabel, onSelect, onEdit, onDelete }: Props) {
  const { t } = useTranslation()

  return (
    <VxTableContainer>
      <VxTable size="small">
        <VxTableHead><VxTableRow>
          <VxTableCell>{t('pages.inventoryAdjustments.table.number')}</VxTableCell>
          <VxTableCell>{t('pages.inventoryAdjustments.table.warehouse')}</VxTableCell>
          <VxTableCell>{t('pages.inventoryAdjustments.table.date')}</VxTableCell>
          <VxTableCell>{t('pages.inventoryAdjustments.table.status')}</VxTableCell>
          <VxTableCell>{t('pages.inventoryAdjustments.table.reason')}</VxTableCell>
          <VxTableCell align="right">{t('pages.inventoryAdjustments.table.actions')}</VxTableCell>
        </VxTableRow></VxTableHead>
        <VxTableBody>
          {loading ? <VxTableRow><VxTableCell colSpan={6}><VxBox sx={{ display: 'grid', placeItems: 'center', minHeight: 160 }}><VxCircularProgress size={28} /></VxBox></VxTableCell></VxTableRow> : null}
          {!loading && rows.map((row) => (
            <VxTableRow key={row.id} hover selected={selectedId === row.id}>
              <VxTableCell>{row.adjustmentNumber}</VxTableCell>
              <VxTableCell>{row.warehouseName ?? row.warehouseId}</VxTableCell>
              <VxTableCell>{row.adjustmentDate}</VxTableCell>
              <VxTableCell>{getStatusLabel(row.status)}</VxTableCell>
              <VxTableCell>{row.reason}</VxTableCell>
              <VxTableCell align="right">
                <VxButton size="small" startIcon={<FormatListBulletedRoundedIcon />} onClick={() => onSelect(row.id)}>{t('pages.inventoryAdjustments.table.lines')}</VxButton>
                {canManage ? <><VxButton size="small" startIcon={<EditRoundedIcon />} onClick={() => onEdit(row)}>{t('pages.inventoryAdjustments.table.edit')}</VxButton><VxButton size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => onDelete(row)}>{t('pages.inventoryAdjustments.table.delete')}</VxButton></> : null}
              </VxTableCell>
            </VxTableRow>
          ))}
          {!loading && rows.length === 0 ? <VxTableRow><VxTableCell colSpan={6}><VxTypography color="text.secondary">{t('pages.inventoryAdjustments.table.empty')}</VxTypography></VxTableCell></VxTableRow> : null}
        </VxTableBody>
      </VxTable>
    </VxTableContainer>
  )
}
