import { useMemo, useState } from 'react'
import { AddRoundedIcon, DeleteOutlineRoundedIcon, EditRoundedIcon } from '@vexorion/ui'
import { Alert, Box, Button, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
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
      <Paper elevation={0} className="panel-card">
        <Typography variant="h6" sx={{ mb: 1 }}>Invoice lines</Typography>
        <Typography color="text.secondary">Pick a sales invoice from the grid to manage its lines.</Typography>
      </Paper>
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
    <Paper elevation={0} className="panel-card">
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h6">Invoice lines for {invoice.invoiceNumber}</Typography>
          <Typography color="text.secondary">Manage billable lines and taxes on this invoice header.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate} disabled={!products.length}>Add line</Button>
      </Stack>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {productsError ? <Alert severity="warning" sx={{ mb: 2 }}>{productsError}</Alert> : null}
      {mutationError ? <Alert severity="error" sx={{ mb: 2 }}>{mutationError}</Alert> : null}
      {feedback ? <Alert severity="success" sx={{ mb: 2 }}>{feedback}</Alert> : null}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Unit price</TableCell>
              <TableCell align="right">Discount</TableCell>
              <TableCell align="right">Tax</TableCell>
              <TableCell align="right">Line total</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line) => {
              const product = productById.get(line.productId)
              return (
                <TableRow key={line.id} hover>
                  <TableCell>{product ? `${product.name} (${product.sku})` : line.productId}</TableCell>
                  <TableCell align="right">{line.quantity}</TableCell>
                  <TableCell align="right">{formatMoney(line.unitPrice)}</TableCell>
                  <TableCell align="right">{formatMoney(line.discountAmount)}</TableCell>
                  <TableCell align="right">{formatMoney(line.taxAmount)}</TableCell>
                  <TableCell align="right">{formatMoney(line.lineTotal)}</TableCell>
                  <TableCell align="right">
                    <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => openEdit(line)}>Edit</Button>
                    <Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => void handleDelete(line.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              )
            })}
            {!isLoading && lines.length === 0 ? <TableRow><TableCell colSpan={7}><Typography color="text.secondary">No lines yet.</Typography></TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </TableContainer>
      <SalesInvoiceLineEditorDialog open={isEditorOpen} mode={dialogMode} line={selectedLine} products={products} onClose={() => setIsEditorOpen(false)} onSaved={handleSave} />
    </Paper>
  )
}