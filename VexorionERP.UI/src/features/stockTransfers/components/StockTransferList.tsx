import { DeleteOutlineRoundedIcon, EditRoundedIcon, FormatListBulletedRoundedIcon } from '@vexorion/ui'
import { VxBox, VxButton, VxCircularProgress, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { StockTransferListItemResponse } from '../../../types/api'

export type StockTransferListRow = StockTransferListItemResponse & { sourceWarehouseName?: string; destinationWarehouseName?: string }
type Props = { rows: StockTransferListRow[]; loading: boolean; selectedId?: string; canManage: boolean; getStatusLabel: (status: number) => string; onSelect: (id: string) => void; onEdit: (row: StockTransferListRow) => void; onDelete: (row: StockTransferListRow) => void }

export default function StockTransferList({ rows, loading, selectedId, canManage, getStatusLabel, onSelect, onEdit, onDelete }: Props) {
  const { t } = useTranslation()
  return <VxTableContainer><VxTable size="small"><VxTableHead><VxTableRow><VxTableCell>{t('pages.stockTransfers.table.number')}</VxTableCell><VxTableCell>{t('pages.stockTransfers.table.source')}</VxTableCell><VxTableCell>{t('pages.stockTransfers.table.destination')}</VxTableCell><VxTableCell>{t('pages.stockTransfers.table.date')}</VxTableCell><VxTableCell>{t('pages.stockTransfers.table.status')}</VxTableCell><VxTableCell align="right">{t('pages.stockTransfers.table.actions')}</VxTableCell></VxTableRow></VxTableHead><VxTableBody>
    {loading ? <VxTableRow><VxTableCell colSpan={6}><VxBox sx={{ display: 'grid', placeItems: 'center', minHeight: 160 }}><VxCircularProgress size={28} /></VxBox></VxTableCell></VxTableRow> : null}
    {!loading && rows.map((row) => <VxTableRow key={row.id} hover selected={selectedId === row.id}><VxTableCell>{row.transferNumber}</VxTableCell><VxTableCell>{row.sourceWarehouseName ?? row.sourceWarehouseId}</VxTableCell><VxTableCell>{row.destinationWarehouseName ?? row.destinationWarehouseId}</VxTableCell><VxTableCell>{row.transferDate}</VxTableCell><VxTableCell>{getStatusLabel(row.status)}</VxTableCell><VxTableCell align="right"><VxButton size="small" startIcon={<FormatListBulletedRoundedIcon />} onClick={() => onSelect(row.id)}>{t('pages.stockTransfers.table.lines')}</VxButton>{canManage ? <><VxButton size="small" startIcon={<EditRoundedIcon />} onClick={() => onEdit(row)}>{t('pages.stockTransfers.table.edit')}</VxButton><VxButton size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => onDelete(row)}>{t('pages.stockTransfers.table.delete')}</VxButton></> : null}</VxTableCell></VxTableRow>)}
    {!loading && rows.length === 0 ? <VxTableRow><VxTableCell colSpan={6}><VxTypography color="text.secondary">{t('pages.stockTransfers.table.empty')}</VxTypography></VxTableCell></VxTableRow> : null}
  </VxTableBody></VxTable></VxTableContainer>
}
