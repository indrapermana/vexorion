import { useEffect, useMemo } from 'react'
import { VxButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxStack, VxTextField } from '@vexorion/ui'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useTranslation } from 'react-i18next'
import LookupSelectField from '../../../components/LookupSelectField'
import PaymentAllocationSummary from '../../../components/PaymentAllocationSummary'
import { useUnsavedChangesPrompt } from '../../../hooks/useUnsavedChangesPrompt'
import { ApiError, createVendorPayment } from '../../../lib/api'
import type { VendorPaymentEditorDialogProps, VendorPaymentFormValues } from '../../../types/ui'
import { getPaymentAllocationError } from '../../../types/ui/paymentAllocations'
import { useCurrency } from '../../../app/CurrencyContext'

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
  const { currencyCode: companyCurrency } = useCurrency()
  const createDefaults = useMemo(() => ({ ...defaultValues, currencyCode: companyCurrency }), [companyCurrency])
  const { t } = useTranslation()
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<VendorPaymentFormValues>({ defaultValues: createDefaults, resolver: yupResolver(validationSchema) })
  const { requestClose, confirmationDialog } = useUnsavedChangesPrompt(open && isDirty, isSubmitting, onClose, () => reset())

  const selectedSupplierId = watch('supplierId')
  const selectedInvoiceId = watch('purchaseInvoiceId')
  const paymentAmount = watch('amount')
  const selectedInvoice = outstandingInvoices.find((invoice) => invoice.id === selectedInvoiceId)
  const currencyCodeForInvoice = watch('currencyCode')
  const allocationError = selectedInvoice
    ? getPaymentAllocationError(selectedInvoice.balanceDue, paymentAmount, selectedInvoice.currencyCode, currencyCodeForInvoice)
    : null
  const exceedsInvoiceBalance = allocationError === 'exceedsBalance'
  const currencyMismatch = allocationError === 'currencyMismatch'

  useEffect(() => {
    reset({ ...createDefaults, ...initialValues })
  }, [createDefaults, initialValues, reset])

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
    clearErrors(['amount', 'currencyCode'])
  }, [clearErrors, outstandingInvoices, selectedInvoiceId, setValue])

  const supplierOptions = suppliers.map((supplier) => ({
    value: supplier.id,
    label: `${supplier.name} (${supplier.supplierNumber})`,
  }))

  const invoiceOptions = useMemo(
    () => outstandingInvoices
      .filter((invoice) => !selectedSupplierId || invoice.supplierId === selectedSupplierId)
      .map((invoice) => ({
        value: invoice.id,
        label: `${invoice.invoiceNumber} - ${invoice.currencyCode} ${invoice.balanceDue.toFixed(2)} ${t('components.vendorPayments.editor.due')}`,
      })),
    [outstandingInvoices, selectedSupplierId, t],
  )

  const onSubmit = handleSubmit(async (values) => {
    const invoice = outstandingInvoices.find((item) => item.id === values.purchaseInvoiceId)
    const allocationError = invoice
      ? getPaymentAllocationError(invoice.balanceDue, values.amount, invoice.currencyCode, values.currencyCode)
      : null
    if (allocationError) {
      const field = allocationError === 'exceedsBalance' ? 'amount' : 'currencyCode'
      setError(field, { type: 'validate', message: t(`orderWorkflow.paymentAllocation.${allocationError}`) })
      return
    }

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
      reset(createDefaults)
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
    <>
    <VxDialog open={open} onClose={requestClose} fullWidth maxWidth="md">
      <VxDialogTitle>{t('components.vendorPayments.editor.title')}</VxDialogTitle>
      <VxDialogContent dividers>
        <VxStack spacing={2.5} sx={{ pt: 1 }}>
          <Controller
            name="supplierId"
            control={control}
            render={({ field }) => (
              <LookupSelectField
                label={t('components.vendorPayments.editor.fields.supplier')}
                value={field.value}
                onChange={field.onChange}
                options={supplierOptions}
                error={Boolean(errors.supplierId)}
                helperText={errors.supplierId?.message}
                disabled={!suppliers.length}
                emptyText={t('components.vendorPayments.editor.empty.suppliers')}
              />
            )}
          />

          <Controller
            name="purchaseInvoiceId"
            control={control}
            render={({ field }) => (
              <LookupSelectField
                label={t('components.vendorPayments.editor.fields.outstandingInvoice')}
                value={field.value}
                onChange={field.onChange}
                options={invoiceOptions}
                error={Boolean(errors.purchaseInvoiceId)}
                helperText={errors.purchaseInvoiceId?.message}
                disabled={!invoiceOptions.length}
                emptyText={t('components.vendorPayments.editor.empty.invoices')}
              />
            )}
          />

          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Controller
              name="paymentDate"
              control={control}
              render={({ field }) => (
                <VxTextField
                  {...field}
                  fullWidth
                  type="date"
                  label={t('components.vendorPayments.editor.fields.paymentDate')}
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
                <VxTextField
                  {...field}
                  fullWidth
                  label={t('components.vendorPayments.editor.fields.amount')}
                  type="number"
                  slotProps={{ htmlInput: { min: 0.01, max: selectedInvoice?.balanceDue, step: '0.01' } }}
                  error={Boolean(errors.amount) || exceedsInvoiceBalance}
                  helperText={errors.amount?.message ?? (exceedsInvoiceBalance ? t('orderWorkflow.paymentAllocation.exceedsBalance') : undefined)}
                  onChange={(event) => {
                    const nextAmount = Number(event.target.value)
                    field.onChange(nextAmount)
                    if (!selectedInvoice || nextAmount <= selectedInvoice.balanceDue) clearErrors('amount')
                  }}
                />
              )}
            />
            <Controller
              name="currencyCode"
              control={control}
              render={({ field }) => (
                <VxTextField
                  {...field}
                  fullWidth
                  label={t('components.vendorPayments.editor.fields.currency')}
                  error={Boolean(errors.currencyCode) || currencyMismatch}
                  helperText={errors.currencyCode?.message ?? (currencyMismatch ? t('orderWorkflow.paymentAllocation.currencyMismatch') : undefined)}
                  onChange={(event) => {
                    field.onChange(event)
                    if (!selectedInvoice || event.target.value.trim().toUpperCase() === selectedInvoice.currencyCode.toUpperCase()) clearErrors('currencyCode')
                  }}
                />
              )}
            />
          </VxStack>

          {selectedInvoice ? (
            <PaymentAllocationSummary invoiceBalance={selectedInvoice.balanceDue} paymentAmount={paymentAmount} currencyCode={selectedInvoice.currencyCode} />
          ) : null}

          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Controller
              name="referenceNumber"
              control={control}
              render={({ field }) => (
                <VxTextField
                  {...field}
                  fullWidth
                  label={t('components.vendorPayments.editor.fields.reference')}
                  error={Boolean(errors.referenceNumber)}
                  helperText={errors.referenceNumber?.message ?? t('components.vendorPayments.editor.optional')}
                />
              )}
            />
            <Controller
              name="paymentMethod"
              control={control}
              render={({ field }) => (
                <VxTextField
                  {...field}
                  fullWidth
                  label={t('components.vendorPayments.editor.fields.paymentMethod')}
                  error={Boolean(errors.paymentMethod)}
                  helperText={errors.paymentMethod?.message ?? t('components.vendorPayments.editor.optional')}
                />
              )}
            />
          </VxStack>

          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <VxTextField
                {...field}
                fullWidth
                multiline
                minRows={3}
                label={t('components.vendorPayments.editor.fields.notes')}
                error={Boolean(errors.notes)}
                helperText={errors.notes?.message ?? t('components.vendorPayments.editor.optional')}
              />
            )}
          />
        </VxStack>
      </VxDialogContent>
      <VxDialogActions sx={{ px: 3, py: 2 }}>
        <VxButton onClick={requestClose} disabled={isSubmitting}>{t('dialogs.cancel')}</VxButton>
        <VxButton
          onClick={() => void onSubmit()}
          variant="contained"
          disabled={isSubmitting || !suppliers.length || !outstandingInvoices.length}
        >
          {isSubmitting ? t('components.vendorPayments.editor.saving') : t('components.vendorPayments.editor.recordAction')}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
    {confirmationDialog}
    </>
  )
}
