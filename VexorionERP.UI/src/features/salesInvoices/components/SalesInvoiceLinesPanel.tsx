import { useMemo, useState } from 'react'
import { AddRoundedIcon, DeleteOutlineRoundedIcon, EditRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxConfirmActionButton, VxPaper, VxStack, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../../../app/CurrencyContext'
import { ApiError, createSalesInvoiceLine, deleteSalesInvoiceLine, updateSalesInvoiceLine } from '../../../lib/api'
import { useProductsLookup } from '../../../hooks/useLookups'
import type { SalesInvoiceLineListItemResponse } from '../../../types/api'
import type { SalesInvoiceGridRow, SalesInvoiceLineFormValues } from '../../../types/ui'
import SalesInvoiceLineEditorDialog from './SalesInvoiceLineEditorDialog'

type SalesInvoiceLinesPanelProps = {
  invoice: SalesInvoiceGridRow | null
  lines: SalesInvoiceLineListItemResponse[]
  isLoading: boolean
  error: string | null
  onRefresh: () => Promise<void>
  canManage?: boolean
  canViewProducts?: boolean
}

export default function SalesInvoiceLinesPanel({ invoice, lines, isLoading, error, onRefresh, canManage = true, canViewProducts = true }: SalesInvoiceLinesPanelProps) {
  const { t } = useTranslation()
  const { formatMoney } = useCurrency()
  const { items: products, error: productsError } = useProductsLookup(Boolean(invoice) && canViewProducts)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [selectedLine, setSelectedLine] = useState<SalesInvoiceLineListItemResponse | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])

  if (!invoice) {
    return (
      <VxPaper elevation={0} className="panel-card">
        <VxTypography component="h2" variant="h6" sx={{ mb: 1 }}>{t('orderWorkflow.line.invoiceLines')}</VxTypography>
        <VxTypography color="text.secondary">{t('pages.salesInvoices.lines.selectPrompt')}</VxTypography>
      </VxPaper>
    )
  }

  const openCreate = () => {
    setMutationError(null)
    setDialogMode('create')
    setSelectedLine(null)
    setIsEditorOpen(true)
  }

  const openEdit = (line: SalesInvoiceLineListItemResponse) => {
    setMutationError(null)
    setDialogMode('edit')
    setSelectedLine(line)
    setIsEditorOpen(true)
  }

  const handleSave = async (mode: 'create' | 'edit', values: SalesInvoiceLineFormValues) => {
    setMutationError(null)
    setFeedback(null)

    const payload = {
      productId: values.productId,
      quantity: values.quantity,
      unitPrice: values.unitPrice,
      discountAmount: values.discountAmount,
      taxAmount: values.taxAmount,
    }

    try {
      if (mode === 'create') {
        await createSalesInvoiceLine(invoice.id, payload)
      } else if (selectedLine) {
        await updateSalesInvoiceLine(invoice.id, selectedLine.id, { ...payload, isActive: values.isActive })
      }
      setFeedback(t(mode === 'create' ? 'pages.salesInvoices.lines.created' : 'pages.salesInvoices.lines.updated'))
      setIsEditorOpen(false)
      await onRefresh()
    } catch (saveError) {
      setMutationError(saveError instanceof ApiError ? saveError.message : t('pages.salesInvoices.lines.saveError'))
    }
  }

  const handleDelete = async (lineId: string) => {
    try {
      setMutationError(null)
      setFeedback(null)
      await deleteSalesInvoiceLine(invoice.id, lineId)
      setFeedback(t('pages.salesInvoices.lines.deleted'))
      await onRefresh()
    } catch (deleteError) {
      setMutationError(deleteError instanceof ApiError ? deleteError.message : t('pages.salesInvoices.lines.deleteError'))
    }
  }

  return (
    <VxPaper elevation={0} className="panel-card">
      <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', mb: 2 }}>
        <VxBox>
          <VxTypography component="h2" variant="h6">{t('orderWorkflow.line.invoiceLinesFor', { number: invoice.invoiceNumber })}</VxTypography>
          <VxTypography color="text.secondary">{t('pages.salesInvoices.lines.description')}</VxTypography>
        </VxBox>
        {canManage ? <VxButton variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate} disabled={!products.length}>{t('orderWorkflow.line.add')}</VxButton> : null}
      </VxStack>
      {error ? <VxAlert severity="error" sx={{ mb: 2 }}>{error}</VxAlert> : null}
      {productsError ? <VxAlert severity="warning" sx={{ mb: 2 }}>{productsError}</VxAlert> : null}
      {mutationError ? <VxAlert severity="error" sx={{ mb: 2 }}>{mutationError}</VxAlert> : null}
      {feedback ? <VxAlert severity="success" sx={{ mb: 2 }}>{feedback}</VxAlert> : null}
      <VxTableContainer>
        <VxTable size="small">
          <VxTableHead>
            <VxTableRow>
              <VxTableCell>{t('orderWorkflow.line.product')}</VxTableCell>
              <VxTableCell align="right">{t('orderWorkflow.line.quantityShort')}</VxTableCell>
              <VxTableCell align="right">{t('orderWorkflow.line.unitPrice')}</VxTableCell>
              <VxTableCell align="right">{t('orderWorkflow.line.discount')}</VxTableCell>
              <VxTableCell align="right">{t('orderWorkflow.line.tax')}</VxTableCell>
              <VxTableCell align="right">{t('orderWorkflow.line.total')}</VxTableCell>
              <VxTableCell align="right">{t('common.actions')}</VxTableCell>
            </VxTableRow>
          </VxTableHead>
          <VxTableBody>
            {lines.map((line) => {
              const product = productById.get(line.productId)
              return (
                <VxTableRow key={line.id} hover>
                  <VxTableCell>{product ? `${product.name} (${product.sku})` : line.productId}</VxTableCell>
                  <VxTableCell align="right">{line.quantity}</VxTableCell>
                  <VxTableCell align="right">{formatMoney(line.unitPrice)}</VxTableCell>
                  <VxTableCell align="right">{formatMoney(line.discountAmount)}</VxTableCell>
                  <VxTableCell align="right">{formatMoney(line.taxAmount)}</VxTableCell>
                  <VxTableCell align="right">{formatMoney(line.lineTotal)}</VxTableCell>
                  <VxTableCell align="right">
                    {canManage ? <><VxButton size="small" startIcon={<EditRoundedIcon />} onClick={() => openEdit(line)}>{t('common.edit')}</VxButton>
                    <VxConfirmActionButton
                      title={t('pages.salesInvoices.lines.deleteTitle')}
                      targetName={productById.get(line.productId)?.name ?? line.productId}
                      consequence={t('pages.salesInvoices.lines.deleteConsequence', { number: invoice.invoiceNumber })}
                      confirmLabel={t('orderWorkflow.line.delete')}
                      pendingLabel={t('dialogs.deleting')}
                      onConfirm={() => handleDelete(line.id)}
                      buttonProps={{ size: 'small', color: 'error', startIcon: <DeleteOutlineRoundedIcon /> }}
                    >{t('common.delete')}</VxConfirmActionButton></> : null}
                  </VxTableCell>
                </VxTableRow>
              )
            })}
            {!isLoading && lines.length === 0 ? <VxTableRow><VxTableCell colSpan={7}><VxTypography color="text.secondary">{t('orderWorkflow.line.empty')}</VxTypography></VxTableCell></VxTableRow> : null}
          </VxTableBody>
        </VxTable>
      </VxTableContainer>
      <SalesInvoiceLineEditorDialog open={canManage && isEditorOpen} mode={dialogMode} line={selectedLine} products={products} onClose={() => setIsEditorOpen(false)} onSaved={handleSave} />
    </VxPaper>
  )
}
