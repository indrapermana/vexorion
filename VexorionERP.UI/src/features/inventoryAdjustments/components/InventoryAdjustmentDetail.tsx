import { AddRoundedIcon, AutoGraphRoundedIcon, DeleteOutlineRoundedIcon, EditRoundedIcon, Inventory2RoundedIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxChip, VxConfirmActionButton, VxPaper, VxStack, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { InventoryAdjustmentDetailsResponse, InventoryAdjustmentLineDetailsResponse } from '../../../types/api'

type Props = {
  adjustment: InventoryAdjustmentDetailsResponse | null
  canManage: boolean
  productsAvailable: boolean
  warehouseName?: string
  productLabels: Map<string, string>
  balances: Map<string, number>
  lineError: string | null
  getStatusLabel: (status: number) => string
  onAddLine: () => void
  onEditLine: (line: InventoryAdjustmentLineDetailsResponse) => void
  onDeleteLine: (lineId: string) => Promise<void>
}

export default function InventoryAdjustmentDetail({ adjustment, canManage, productsAvailable, warehouseName, productLabels, balances, lineError, getStatusLabel, onAddLine, onEditLine, onDeleteLine }: Props) {
  const { t } = useTranslation()

  return <VxPaper elevation={0} className="panel-card">
    {!adjustment ? <><VxTypography component="h2" variant="h6" sx={{ mb: 1 }}>{t('pages.inventoryAdjustments.linePanel.title')}</VxTypography><VxTypography color="text.secondary">{t('pages.inventoryAdjustments.linePanel.selectPrompt')}</VxTypography></> : <>
      <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', mb: 2 }}>
        <VxBox><VxTypography component="h2" variant="h6">{t('pages.inventoryAdjustments.linePanel.titleFor', { number: adjustment.adjustmentNumber })}</VxTypography><VxTypography color="text.secondary">{t('pages.inventoryAdjustments.linePanel.deltaHelp')}</VxTypography></VxBox>
        {canManage ? <VxButton variant="contained" startIcon={<AddRoundedIcon />} onClick={onAddLine} disabled={adjustment.status !== 1 || !productsAvailable}>{t('pages.inventoryAdjustments.linePanel.add')}</VxButton> : null}
      </VxStack>
      <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}><VxChip icon={<Inventory2RoundedIcon />} label={t('pages.inventoryAdjustments.linePanel.status', { status: getStatusLabel(adjustment.status) })} variant="outlined" color={adjustment.status === 4 ? 'success' : 'default'} /><VxChip icon={<AutoGraphRoundedIcon />} label={t('pages.inventoryAdjustments.linePanel.warehouse', { warehouse: warehouseName ?? adjustment.warehouseId })} variant="outlined" color="primary" /></VxStack>
      {adjustment.status !== 1 ? <VxAlert severity="info" sx={{ mb: 2 }}>{t('pages.inventoryAdjustments.linePanel.locked')}</VxAlert> : null}
      {lineError ? <VxAlert severity="error" sx={{ mb: 2 }}>{lineError}</VxAlert> : null}
      <VxTableContainer><VxTable size="small"><VxTableHead><VxTableRow><VxTableCell>{t('pages.inventoryAdjustments.linePanel.product')}</VxTableCell><VxTableCell align="right">{t('pages.inventoryAdjustments.linePanel.onHand')}</VxTableCell><VxTableCell align="right">{t('pages.inventoryAdjustments.linePanel.delta')}</VxTableCell><VxTableCell align="right">{t('pages.inventoryAdjustments.linePanel.unitCost')}</VxTableCell><VxTableCell align="right">{t('pages.inventoryAdjustments.linePanel.extended')}</VxTableCell><VxTableCell>{t('pages.inventoryAdjustments.table.reason')}</VxTableCell><VxTableCell align="right">{t('pages.inventoryAdjustments.table.actions')}</VxTableCell></VxTableRow></VxTableHead>
        <VxTableBody>{adjustment.lines.map((line) => { const label = productLabels.get(line.productId); return <VxTableRow key={line.id} hover><VxTableCell>{label ?? line.productId}</VxTableCell><VxTableCell align="right">{(balances.get(line.productId) ?? 0).toFixed(2)}</VxTableCell><VxTableCell align="right">{line.quantityDelta.toFixed(2)}</VxTableCell><VxTableCell align="right">${line.unitCost.toFixed(2)}</VxTableCell><VxTableCell align="right">${(line.quantityDelta * line.unitCost).toFixed(2)}</VxTableCell><VxTableCell>{line.reason ?? '-'}</VxTableCell><VxTableCell align="right">{canManage ? <><VxButton size="small" startIcon={<EditRoundedIcon />} onClick={() => onEditLine(line)} disabled={adjustment.status !== 1}>{t('pages.inventoryAdjustments.table.edit')}</VxButton><VxConfirmActionButton title={t('pages.inventoryAdjustments.linePanel.deleteTitle')} targetName={label ?? line.productId} consequence={t('pages.inventoryAdjustments.linePanel.deleteConsequence', { number: adjustment.adjustmentNumber })} confirmLabel={t('pages.inventoryAdjustments.linePanel.deleteConfirm')} pendingLabel={t('pages.inventoryAdjustments.linePanel.deleting')} onConfirm={() => onDeleteLine(line.id)} buttonProps={{ size: 'small', color: 'error', startIcon: <DeleteOutlineRoundedIcon />, disabled: adjustment.status !== 1 }}>{t('pages.inventoryAdjustments.table.delete')}</VxConfirmActionButton></> : null}</VxTableCell></VxTableRow> })}
          {adjustment.lines.length === 0 ? <VxTableRow><VxTableCell colSpan={7}><VxTypography color="text.secondary">{t('pages.inventoryAdjustments.linePanel.empty')}</VxTypography></VxTableCell></VxTableRow> : null}</VxTableBody>
      </VxTable></VxTableContainer>
    </>}
  </VxPaper>
}
