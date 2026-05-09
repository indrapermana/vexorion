import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import LookupSelectField from '../../../components/LookupSelectField'
import { ApiError, createPurchaseOrder, getPurchaseOrder, updatePurchaseOrder } from '../../../lib/api'
import type { ValidationProblem } from '../../../types/api'
import { documentStatusOptions, type PurchaseOrderEditorDialogProps, type PurchaseOrderFormValues } from '../../../types/ui'

const today = new Date().toISOString().slice(0, 10)

const defaultValues: PurchaseOrderFormValues = {
  orderNumber: '',
  supplierId: '',
  warehouseId: '',
  orderDate: today,
  expectedReceiptDate: today,
  status: 1,
  currencyCode: 'USD',
  notes: '',
  isActive: true,
}

const validationSchema: yup.ObjectSchema<PurchaseOrderFormValues> = yup.object({
  orderNumber: yup.string().trim().required('Order number is required.').max(50, 'Order number must be at most 50 characters.'),
  supplierId: yup.string().trim().required('Supplier is required.'),
  warehouseId: yup.string().trim().required('Warehouse is required.'),
  orderDate: yup.string().required('Order date is required.'),
  expectedReceiptDate: yup.string().required('Expected receipt date is required.'),
  status: yup.number().oneOf(documentStatusOptions.map((option) => option.value)).required('Status is required.'),
  currencyCode: yup.string().trim().required('Currency code is required.').length(3, 'Currency code must be exactly 3 characters.'),
  notes: yup.string().max(1000, 'Notes must be at most 1000 characters.').defined(),
  isActive: yup.boolean().required(),
})

function normalizeServerFieldName(fieldName: string): keyof PurchaseOrderFormValues | null {
  const normalized = fieldName.charAt(0).toLowerCase() + fieldName.slice(1)
  if (normalized in defaultValues) return normalized as keyof PurchaseOrderFormValues
  return null
}

function optionalText(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export default function PurchaseOrderEditorDialog({ open, mode, purchaseOrderId, suppliers, warehouses, onClose, onSaved }: PurchaseOrderEditorDialogProps) {
  useTranslation()
  const [isLoadingPurchaseOrder, setIsLoadingPurchaseOrder] = useState(mode === 'edit' && Boolean(purchaseOrderId))
  const [submitError, setSubmitError] = useState<string | null>(null)

  const title = useMemo(() => (mode === 'create' ? 'Create purchase order' : 'Edit purchase order'), [mode])
  const { control, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<PurchaseOrderFormValues>({ defaultValues, resolver: yupResolver(validationSchema) })

  useEffect(() => {
    if (mode === 'create' || !purchaseOrderId) {
      if (mode === 'create') reset(defaultValues)
      return
    }

    let isMounted = true

    void getPurchaseOrder(purchaseOrderId)
      .then((purchaseOrder) => {
        if (!isMounted) return
        reset({
          orderNumber: purchaseOrder.orderNumber,
          supplierId: purchaseOrder.supplierId,
          warehouseId: purchaseOrder.warehouseId,
          orderDate: purchaseOrder.orderDate,
          expectedReceiptDate: purchaseOrder.expectedReceiptDate,
          status: purchaseOrder.status,
          currencyCode: purchaseOrder.currencyCode,
          notes: purchaseOrder.notes ?? '',
          isActive: purchaseOrder.isActive,
        })
      })
      .catch((error: unknown) => {
        if (!isMounted) return
        if (error instanceof ApiError) setSubmitError(error.message)
        else setSubmitError('Unable to load purchase order details.')
      })
      .finally(() => {
        if (isMounted) setIsLoadingPurchaseOrder(false)
      })

    return () => {
      isMounted = false
    }
  }, [mode, purchaseOrderId, reset])

  const supplierOptions = suppliers.map((supplier) => ({ value: supplier.id, label: `${supplier.name} (${supplier.supplierNumber})` }))
  const warehouseOptions = warehouses.map((warehouse) => ({ value: warehouse.id, label: `${warehouse.name} (${warehouse.code})` }))

  const applyServerValidation = (validation?: ValidationProblem) => {
    if (!validation) return
    Object.entries(validation).forEach(([fieldName, fieldErrors]) => {
      const normalizedFieldName = normalizeServerFieldName(fieldName)
      if (normalizedFieldName && fieldErrors.length > 0) setError(normalizedFieldName, { message: fieldErrors[0] })
    })
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)
    const payload = {
      orderNumber: values.orderNumber.trim(),
      supplierId: values.supplierId,
      warehouseId: values.warehouseId,
      orderDate: values.orderDate,
      expectedReceiptDate: values.expectedReceiptDate,
      status: values.status,
      currencyCode: values.currencyCode.trim().toUpperCase(),
      notes: optionalText(values.notes),
    }

    try {
      const savedPurchaseOrder = mode === 'create'
        ? await createPurchaseOrder(payload)
        : await updatePurchaseOrder(purchaseOrderId!, { ...payload, isActive: values.isActive })
      onSaved(savedPurchaseOrder, mode)
      reset(defaultValues)
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message)
        applyServerValidation(error.validation)
      } else {
        setSubmitError('Unable to save purchase order right now.')
      }
    }
  })

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        {isLoadingPurchaseOrder ? (
          <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 220 }}><Stack spacing={1.5} sx={{ alignItems: 'center' }}><CircularProgress size={28} /><Typography color="text.secondary">Loading purchase order details...</Typography></Stack></Box>
        ) : (
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {submitError ? <Alert severity="error">{submitError}</Alert> : null}
            {!suppliers.length ? <Alert severity="warning">Create at least one supplier before creating a purchase order.</Alert> : null}
            {!warehouses.length ? <Alert severity="warning">Create at least one warehouse before creating a purchase order.</Alert> : null}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller name="orderNumber" control={control} render={({ field }) => <TextField {...field} fullWidth label="Order number" error={Boolean(errors.orderNumber)} helperText={errors.orderNumber?.message} />} />
              <Controller name="currencyCode" control={control} render={({ field }) => <TextField {...field} fullWidth label="Currency code" error={Boolean(errors.currencyCode)} helperText={errors.currencyCode?.message} slotProps={{ htmlInput: { maxLength: 3 } }} />} />
            </Stack>
            <Controller name="supplierId" control={control} render={({ field }) => <LookupSelectField label="Supplier" value={field.value} onChange={field.onChange} options={supplierOptions} error={Boolean(errors.supplierId)} helperText={errors.supplierId?.message} disabled={!suppliers.length} emptyText="No suppliers available" />} />
            <Controller name="warehouseId" control={control} render={({ field }) => <LookupSelectField label="Warehouse" value={field.value} onChange={field.onChange} options={warehouseOptions} error={Boolean(errors.warehouseId)} helperText={errors.warehouseId?.message} disabled={!warehouses.length} emptyText="No warehouses available" />} />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller name="orderDate" control={control} render={({ field }) => <TextField {...field} fullWidth type="date" label="Order date" slotProps={{ inputLabel: { shrink: true } }} error={Boolean(errors.orderDate)} helperText={errors.orderDate?.message} />} />
              <Controller name="expectedReceiptDate" control={control} render={({ field }) => <TextField {...field} fullWidth type="date" label="Expected receipt" slotProps={{ inputLabel: { shrink: true } }} error={Boolean(errors.expectedReceiptDate)} helperText={errors.expectedReceiptDate?.message} />} />
            </Stack>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <TextField {...field} fullWidth select label="Status" error={Boolean(errors.status)} helperText={errors.status?.message} onChange={(event) => field.onChange(Number(event.target.value))}>
                  {documentStatusOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                </TextField>
              )}
            />
            <Controller name="notes" control={control} render={({ field }) => <TextField {...field} fullWidth multiline minRows={3} label="Notes" error={Boolean(errors.notes)} helperText={errors.notes?.message ?? 'Optional'} />} />
            {mode === 'edit' ? <Controller name="isActive" control={control} render={({ field }) => <FormControlLabel control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />} label={field.value ? 'Order is active' : 'Order is inactive'} />} /> : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button onClick={() => void onSubmit()} variant="contained" disabled={isSubmitting || isLoadingPurchaseOrder || suppliers.length === 0 || warehouses.length === 0}>{isSubmitting ? 'Saving...' : mode === 'create' ? 'Create purchase order' : 'Save changes'}</Button>
      </DialogActions>
    </Dialog>
  )
}