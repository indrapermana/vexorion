import { useEffect, useMemo } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import LookupSelectField from '../../../components/LookupSelectField'
import { ApiError, createVendorPayment } from '../../../lib/api'
import type { VendorPaymentEditorDialogProps, VendorPaymentFormValues } from '../../../types/ui'

const defaultValues: VendorPaymentFormValues = {
  supplierId: '',
  purchaseInvoiceId: '',
  paymentDate: new Date().toISOString().slice(0, 10),
  amount: 0,
  currencyCode: 'USD',
  referenceNumber: '',
  paymentMethod: '',
  notes: '',
}

const validationSchema: yup.ObjectSchema<VendorPaymentFormValues> = yup.object({
  supplierId: yup.string().required('Supplier is required.'),
  purchaseInvoiceId: yup.string().required('Invoice is required.'),
  paymentDate: yup.string().required('Payment date is required.'),
  amount: yup.number().moreThan(0, 'Amount must be greater than zero.').required('Amount is required.'),
  currencyCode: yup.string().trim().required('Currency code is required.').length(3, 'Currency code must be exactly 3 characters.'),
  referenceNumber: yup.string().max(50, 'Reference must be at most 50 characters.').defined(),
  paymentMethod: yup.string().max(50, 'Payment method must be at most 50 characters.').defined(),
  notes: yup.string().max(1000, 'Notes must be at most 1000 characters.').defined(),
})

function optionalText(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export default function VendorPaymentEditorDialog({ open, suppliers, outstandingInvoices, initialValues, onClose, onSaved }: VendorPaymentEditorDialogProps) {
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VendorPaymentFormValues>({ defaultValues, resolver: yupResolver(validationSchema) })

  const selectedSupplierId = watch('supplierId')
  const selectedInvoiceId = watch('purchaseInvoiceId')

  useEffect(() => {
    reset({ ...defaultValues, ...initialValues })
  }, [initialValues, reset])

  useEffect(() => {
    if (!selectedSupplierId) {
      setValue('purchaseInvoiceId', '')
      return
    }

    const invoiceIsStillValid = outstandingInvoices.some((invoice) => invoice.id === selectedInvoiceId && invoice.supplierId === selectedSupplierId)
    if (!invoiceIsStillValid) {
      const firstMatching = outstandingInvoices.find((invoice) => invoice.supplierId === selectedSupplierId)
      setValue('purchaseInvoiceId', firstMatching?.id ?? '')
    }
  }, [outstandingInvoices, selectedSupplierId, selectedInvoiceId, setValue])

  useEffect(() => {
    if (!selectedInvoiceId) {
      return
    }

    const selectedInvoice = outstandingInvoices.find((invoice) => invoice.id === selectedInvoiceId)
    if (!selectedInvoice) {
      return
    }

    setValue('currencyCode', selectedInvoice.currencyCode)
    setValue('amount', selectedInvoice.balanceDue)
  }, [outstandingInvoices, selectedInvoiceId, setValue])

  const supplierOptions = suppliers.map((supplier) => ({
    value: supplier.id,
    label: `${supplier.name} (${supplier.supplierNumber})`,
  }))

  const invoiceOptions = useMemo(
    () => outstandingInvoices
      .filter((invoice) => !selectedSupplierId || invoice.supplierId === selectedSupplierId)
      .map((invoice) => ({
        value: invoice.id,
        label: `${invoice.invoiceNumber} - ${invoice.currencyCode} ${invoice.balanceDue.toFixed(2)} due`,
      })),
    [outstandingInvoices, selectedSupplierId],
  )

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payment = await createVendorPayment({
        supplierId: values.supplierId,
        purchaseInvoiceId: values.purchaseInvoiceId,
        paymentDate: values.paymentDate,
        amount: values.amount,
        currencyCode: values.currencyCode.trim().toUpperCase(),
        referenceNumber: optionalText(values.referenceNumber),
        paymentMethod: optionalText(values.paymentMethod),
        notes: optionalText(values.notes),
      })

      onSaved(payment, 'create')
      reset(defaultValues)
    } catch (error) {
      if (error instanceof ApiError && error.validation) {
        Object.entries(error.validation).forEach(([key, messages]) => {
          const fieldName = (key.charAt(0).toLowerCase() + key.slice(1)) as keyof VendorPaymentFormValues
          if (messages.length > 0) {
            setError(fieldName, { message: messages[0] })
          }
        })
      }
    }
  })

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>Record vendor payment</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Controller
            name="supplierId"
            control={control}
            render={({ field }) => (
              <LookupSelectField
                label="Supplier"
                value={field.value}
                onChange={field.onChange}
                options={supplierOptions}
                error={Boolean(errors.supplierId)}
                helperText={errors.supplierId?.message}
                disabled={!suppliers.length}
                emptyText="No suppliers available"
              />
            )}
          />

          <Controller
            name="purchaseInvoiceId"
            control={control}
            render={({ field }) => (
              <LookupSelectField
                label="Outstanding invoice"
                value={field.value}
                onChange={field.onChange}
                options={invoiceOptions}
                error={Boolean(errors.purchaseInvoiceId)}
                helperText={errors.purchaseInvoiceId?.message}
                disabled={!invoiceOptions.length}
                emptyText="No outstanding invoices available"
              />
            )}
          />

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Controller
              name="paymentDate"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  type="date"
                  label="Payment date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={Boolean(errors.paymentDate)}
                  helperText={errors.paymentDate?.message}
                />
              )}
            />
            <Controller
              name="amount"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Amount"
                  type="number"
                  slotProps={{ htmlInput: { min: 0.01, step: '0.01' } }}
                  error={Boolean(errors.amount)}
                  helperText={errors.amount?.message}
                  onChange={(event) => field.onChange(Number(event.target.value))}
                />
              )}
            />
            <Controller
              name="currencyCode"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Currency"
                  error={Boolean(errors.currencyCode)}
                  helperText={errors.currencyCode?.message}
                />
              )}
            />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Controller
              name="referenceNumber"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Reference"
                  error={Boolean(errors.referenceNumber)}
                  helperText={errors.referenceNumber?.message ?? 'Optional'}
                />
              )}
            />
            <Controller
              name="paymentMethod"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Payment method"
                  error={Boolean(errors.paymentMethod)}
                  helperText={errors.paymentMethod?.message ?? 'Optional'}
                />
              )}
            />
          </Stack>

          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                multiline
                minRows={3}
                label="Notes"
                error={Boolean(errors.notes)}
                helperText={errors.notes?.message ?? 'Optional'}
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button
          onClick={() => void onSubmit()}
          variant="contained"
          disabled={isSubmitting || !suppliers.length || !outstandingInvoices.length}
        >
          {isSubmitting ? 'Saving...' : 'Record payment'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
