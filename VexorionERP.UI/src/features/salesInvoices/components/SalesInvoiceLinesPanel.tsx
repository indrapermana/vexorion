import { useMemo, useState } from 'react'
import { AddRoundedIcon, DeleteOutlineRoundedIcon, EditRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxPaper, VxStack, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTypography } from '@vexorion/ui'
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
}

export default function SalesInvoiceLinesPanel({ invoice, lines, isLoading, error, onRefresh }: SalesInvoiceLinesPanelProps) {
  useTranslation()
  const { formatMoney } = useCurrency()
  const { items: products, error: productsError } = useProductsLookup(Boolean(invoice))
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [selectedLine, setSelectedLine] = useState<SalesInvoiceLineListItemResponse | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])

  if (!invoice) {
    return (
      <VxPaper elevation={0} className="panel-card">
        <VxTypography variant="h6" sx={{ mb: 1 }}>Invoice lines</VxTypography>
        <VxTypography color="text.secondary">Pick a sales invoice from the grid to manage its lines.</VxTypography>
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
      setFeedback(mode === 'create' ? 'Sales invoice line created.' : 'Sales invoice line updated.')
      setIsEditorOpen(false)
      await onRefresh()
    } catch (saveError) {
      setMutationError(saveError instanceof ApiError ? saveError.message : 'Unable to save sales invoice line.')
    }
  }

  const handleDelete = async (lineId: string) => {
    try {
      setMutationError(null)
      setFeedback(null)
      await deleteSalesInvoiceLine(invoice.id, lineId)
      setFeedback('Sales invoice line deleted.')
      await onRefresh()
    } catch (deleteError) {
      setMutationError(deleteError instanceof ApiError ? deleteError.message : 'Unable to delete sales invoice line.')
    }
  }

  return (
    <VxPaper elevation={0} className="panel-card">
      <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', mb: 2 }}>
        <VxBox>
          <VxTypography variant="h6">Invoice lines for {invoice.invoiceNumber}</VxTypography>
          <VxTypography color="text.secondary">Manage billable lines and taxes on this invoice header.</VxTypography>
        </VxBox>
        <VxButton variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate} disabled={!products.length}>Add line</VxButton>
      </VxStack>
      {error ? <VxAlert severity="error" sx={{ mb: 2 }}>{error}</VxAlert> : null}
      {productsError ? <VxAlert severity="warning" sx={{ mb: 2 }}>{productsError}</VxAlert> : null}
      {mutationError ? <VxAlert severity="error" sx={{ mb: 2 }}>{mutationError}</VxAlert> : null}
      {feedback ? <VxAlert severity="success" sx={{ mb: 2 }}>{feedback}</VxAlert> : null}
      <VxTableContainer>
        <VxTable size="small">
          <VxTableHead>
            <VxTableRow>
              <VxTableCell>Product</VxTableCell>
              <VxTableCell align="right">Qty</VxTableCell>
              <VxTableCell align="right">Unit price</VxTableCell>
              <VxTableCell align="right">Discount</VxTableCell>
              <VxTableCell align="right">Tax</VxTableCell>
              <VxTableCell align="right">Line total</VxTableCell>
              <VxTableCell align="right">Actions</VxTableCell>
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
                    <VxButton size="small" startIcon={<EditRoundedIcon />} onClick={() => openEdit(line)}>Edit</VxButton>
                    <VxButton size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => void handleDelete(line.id)}>Delete</VxButton>
                  </VxTableCell>
                </VxTableRow>
              )
            })}
            {!isLoading && lines.length === 0 ? <VxTableRow><VxTableCell colSpan={7}><VxTypography color="text.secondary">No lines yet.</VxTypography></VxTableCell></VxTableRow> : null}
          </VxTableBody>
        </VxTable>
      </VxTableContainer>
      <SalesInvoiceLineEditorDialog open={isEditorOpen} mode={dialogMode} line={selectedLine} products={products} onClose={() => setIsEditorOpen(false)} onSaved={handleSave} />
    </VxPaper>
  )
}