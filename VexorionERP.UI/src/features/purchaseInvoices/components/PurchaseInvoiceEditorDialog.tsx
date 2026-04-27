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
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import LookupSelectField from '../../../components/LookupSelectField'
import { ApiError, createPurchaseInvoice, getPurchaseInvoice, updatePurchaseInvoice } from '../../../lib/api'
import type { ValidationProblem } from '../../../types/api'
import { invoiceStatusOptions, type PurchaseInvoiceEditorDialogProps, type PurchaseInvoiceFormValues } from '../../../types/ui'

const defaultValues: PurchaseInvoiceFormValues = {
  invoiceNumber: '',
  supplierId: '',
  vendorReferenceNumber: '',
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date().toISOString().slice(0, 10),
  status: 1,
  currencyCode: 'USD',
  notes: '',
  isActive: true,
  sourcePurchaseOrderId: null,
}

const validationSchema: yup.ObjectSchema<PurchaseInvoiceFormValues> = yup.object({
  invoiceNumber: yup.string().trim().required('Invoice number is required.').max(50, 'Invoice number must be at most 50 characters.'),
  supplierId: yup.string().trim().required('Supplier is required.'),
  vendorReferenceNumber: yup.string().max(100, 'Vendor reference number must be at most 100 characters.').defined(),
  invoiceDate: yup.string().required('Invoice date is required.'),
  dueDate: yup.string().required('Due date is required.'),
  status: yup.number().oneOf(invoiceStatusOptions.map((option) => option.value)).required('Status is required.'),
  currencyCode: yup.string().trim().required('Currency code is required.').length(3, 'Currency code must be exactly 3 characters.'),
  notes: yup.string().max(1000, 'Notes must be at most 1000 characters.').defined(),
  isActive: yup.boolean().required(),
  sourcePurchaseOrderId: yup.string().nullable().optional().defined(),
})

function normalizeServerFieldName(fieldName: string): keyof PurchaseInvoiceFormValues | null {
  const normalized = fieldName.charAt(0).toLowerCase() + fieldName.slice(1)
  if (normalized in defaultValues) {
    return normalized as keyof PurchaseInvoiceFormValues
  }

  return null
}

function optionalText(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export default function PurchaseInvoiceEditorDialog({ open, mode, purchaseInvoiceId, suppliers, initialValues, onClose, onSaved }: PurchaseInvoiceEditorDialogProps) {
  useTranslation()
  const [isLoadingPurchaseInvoice, setIsLoadingPurchaseInvoice] = useState(mode === 'edit' && Boolean(purchaseInvoiceId))
  const [submitError, setSubmitError] = useState<string | null>(null)

  const title = useMemo(() => (mode === 'create' ? 'Create purchase invoice' : 'Edit purchase invoice'), [mode])
  const { control, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<PurchaseInvoiceFormValues>({
    defaultValues,
    resolver: yupResolver(validationSchema),
  })

  useEffect(() => {
    if (mode === 'create') {
      reset({ ...defaultValues, ...initialValues })
      setIsLoadingPurchaseInvoice(false)
      return
    }

    if (!purchaseInvoiceId) {
      return
    }

    let isMounted = true
    setIsLoadingPurchaseInvoice(true)

    void getPurchaseInvoice(purchaseInvoiceId)
      .then((purchaseInvoice) => {
        if (!isMounted) {
          return
        }

        reset({
          invoiceNumber: purchaseInvoice.invoiceNumber,
          supplierId: purchaseInvoice.supplierId,
          vendorReferenceNumber: purchaseInvoice.vendorReferenceNumber ?? '',
          invoiceDate: purchaseInvoice.invoiceDate,
          dueDate: purchaseInvoice.dueDate,
          status: purchaseInvoice.status,
          currencyCode: purchaseInvoice.currencyCode,
          notes: purchaseInvoice.notes ?? '',
          isActive: purchaseInvoice.isActive,
          sourcePurchaseOrderId: purchaseInvoice.sourcePurchaseOrderId ?? null,
        })
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return
        }

        if (error instanceof ApiError) {
          setSubmitError(error.message)
        } else {
          setSubmitError('Unable to load purchase invoice details.')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingPurchaseInvoice(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [initialValues, mode, purchaseInvoiceId, reset])

  const applyServerValidation = (validation?: ValidationProblem) => {
    if (!validation) {
      return
    }

    Object.entries(validation).forEach(([fieldName, fieldErrors]) => {
      const normalizedFieldName = normalizeServerFieldName(fieldName)
      if (normalizedFieldName && fieldErrors.length > 0) {
        setError(normalizedFieldName, { message: fieldErrors[0] })
      }
    })
  }

  const supplierOptions = suppliers.map((supplier) => ({ value: supplier.id, label: `${supplier.name} (${supplier.supplierNumber})` }))
  const sourceLocked = mode === 'create' && Boolean(initialValues?.sourcePurchaseOrderId)

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)

    const payload = {
      invoiceNumber: values.invoiceNumber.trim(),
      supplierId: values.supplierId,
      sourcePurchaseOrderId: values.sourcePurchaseOrderId ?? null,
      sourcePurchaseReceiptId: null,
      vendorReferenceNumber: optionalText(values.vendorReferenceNumber),
      invoiceDate: values.invoiceDate,
      dueDate: values.dueDate,
      paymentTermId: null,
      status: values.status,
      currencyCode: values.currencyCode.trim().toUpperCase(),
      notes: optionalText(values.notes),
    }

    try {
      const savedPurchaseInvoice = mode === 'create'
        ? await createPurchaseInvoice(payload)
        : await updatePurchaseInvoice(purchaseInvoiceId!, { ...payload, isActive: values.isActive })

      onSaved(savedPurchaseInvoice, mode)
      reset(defaultValues)
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message)
        applyServerValidation(error.validation)
      } else {
        setSubmitError('Unable to save purchase invoice right now.')
      }
    }
  })

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        {isLoadingPurchaseInvoice ? (
          <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 220 }}><Stack spacing={1.5} sx={{ alignItems: 'center' }}><CircularProgress size={28} /><Typography color="text.secondary">Loading purchase invoice details...</Typography></Stack></Box>
        ) : (
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {submitError ? <Alert severity="error">{submitError}</Alert> : null}
            {sourceLocked ? <Alert severity="info">This invoice will be created from the selected purchase order. Supplier and currency will follow the source document.</Alert> : null}
            {!suppliers.length ? <Alert severity="warning">Create at least one supplier before creating a purchase invoice.</Alert> : null}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller name="invoiceNumber" control={control} render={({ field }) => <TextField {...field} fullWidth label="Invoice number" error={Boolean(errors.invoiceNumber)} helperText={errors.invoiceNumber?.message} />} />
              <Controller name="currencyCode" control={control} render={({ field }) => <TextField {...field} fullWidth label="Currency code" error={Boolean(errors.currencyCode)} helperText={errors.currencyCode?.message} slotProps={{ htmlInput: { maxLength: 3 } }} disabled={sourceLocked} />} />
            </Stack>
            <Controller name="supplierId" control={control} render={({ field }) => <LookupSelectField label="Supplier" value={field.value} onChange={field.onChange} options={supplierOptions} error={Boolean(errors.supplierId)} helperText={errors.supplierId?.message} disabled={!suppliers.length || sourceLocked} emptyText="No suppliers available" />} />
            <Controller name="vendorReferenceNumber" control={control} render={({ field }) => <TextField {...field} fullWidth label="Vendor reference number" error={Boolean(errors.vendorReferenceNumber)} helperText={errors.vendorReferenceNumber?.message ?? 'Optional'} />} />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller name="invoiceDate" control={control} render={({ field }) => <TextField {...field} fullWidth type="date" label="Invoice date" slotProps={{ inputLabel: { shrink: true } }} error={Boolean(errors.invoiceDate)} helperText={errors.invoiceDate?.message} />} />
              <Controller name="dueDate" control={control} render={({ field }) => <TextField {...field} fullWidth type="date" label="Due date" slotProps={{ inputLabel: { shrink: true } }} error={Boolean(errors.dueDate)} helperText={errors.dueDate?.message} />} />
            </Stack>
            <Controller name="status" control={control} render={({ field }) => (
              <TextField {...field} fullWidth select label="Status" error={Boolean(errors.status)} helperText={errors.status?.message} onChange={(event) => field.onChange(Number(event.target.value))}>
                {invoiceStatusOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
              </TextField>
            )} />
            <Controller name="notes" control={control} render={({ field }) => <TextField {...field} fullWidth multiline minRows={3} label="Notes" error={Boolean(errors.notes)} helperText={errors.notes?.message ?? 'Optional'} />} />
            {mode === 'edit' ? <Controller name="isActive" control={control} render={({ field }) => <FormControlLabel control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />} label={field.value ? 'Invoice is active' : 'Invoice is inactive'} />} /> : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button onClick={() => void onSubmit()} variant="contained" disabled={isSubmitting || isLoadingPurchaseInvoice || suppliers.length === 0}>{isSubmitting ? 'Saving...' : mode === 'create' ? 'Create purchase invoice' : 'Save changes'}</Button>
      </DialogActions>
    </Dialog>
  )
}