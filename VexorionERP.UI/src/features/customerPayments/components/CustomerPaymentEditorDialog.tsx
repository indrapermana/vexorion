import { useEffect, useMemo } from 'react'
import { VxButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxStack, VxTextField } from '@vexorion/ui'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useTranslation } from 'react-i18next'
import LookupSelectField from '../../../components/LookupSelectField'
import PaymentAllocationSummary from '../../../components/PaymentAllocationSummary'
import { useUnsavedChangesPrompt } from '../../../hooks/useUnsavedChangesPrompt'
import { ApiError, createCustomerPayment } from '../../../lib/api'
import type { CustomerPaymentEditorDialogProps, CustomerPaymentFormValues } from '../../../types/ui'
import { getPaymentAllocationError } from '../../../types/ui/paymentAllocations'
import { useCurrency } from '../../../app/CurrencyContext'

const defaultValues: CustomerPaymentFormValues = {
  customerId: '',
  salesInvoiceId: '',
  paymentDate: new Date().toISOString().slice(0, 10),
  amount: 0,
  currencyCode: 'USD',
  referenceNumber: '',
  paymentMethod: '',
  notes: '',
}

const validationSchema: yup.ObjectSchema<CustomerPaymentFormValues> = yup.object({
  customerId: yup.string().required('Customer is required.'),
  salesInvoiceId: yup.string().required('Invoice is required.'),
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

export default function CustomerPaymentEditorDialog({ open, customers, outstandingInvoices, initialValues, onClose, onSaved }: CustomerPaymentEditorDialogProps) {
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
  } = useForm<CustomerPaymentFormValues>({ defaultValues: createDefaults, resolver: yupResolver(validationSchema) })
  const { requestClose, confirmationDialog } = useUnsavedChangesPrompt(open && isDirty, isSubmitting, onClose, () => reset())

  const selectedCustomerId = watch('customerId')
  const selectedInvoiceId = watch('salesInvoiceId')
  const paymentAmount = watch('amount')
  const currencyCodeForInvoice = watch('currencyCode')
  const selectedInvoice = outstandingInvoices.find((invoice) => invoice.id === selectedInvoiceId)
  const allocationError = selectedInvoice
    ? getPaymentAllocationError(selectedInvoice.balanceDue, paymentAmount, selectedInvoice.currencyCode, currencyCodeForInvoice)
    : null
  const exceedsInvoiceBalance = allocationError === 'exceedsBalance'
  const currencyMismatch = allocationError === 'currencyMismatch'

  useEffect(() => {
    reset({ ...createDefaults, ...initialValues })
  }, [createDefaults, initialValues, reset])

  useEffect(() => {
    if (!selectedCustomerId) {
      setValue('salesInvoiceId', '')
      return
    }

    const invoiceIsStillValid = outstandingInvoices.some((invoice) => invoice.id === selectedInvoiceId && invoice.customerId === selectedCustomerId)
    if (!invoiceIsStillValid) {
      const firstMatching = outstandingInvoices.find((invoice) => invoice.customerId === selectedCustomerId)
      setValue('salesInvoiceId', firstMatching?.id ?? '')
    }
  }, [outstandingInvoices, selectedCustomerId, selectedInvoiceId, setValue])

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

  const customerOptions = customers.map((customer) => ({
    value: customer.id,
    label: `${customer.name} (${customer.customerNumber})`,
  }))

  const invoiceOptions = useMemo(
    () => outstandingInvoices
      .filter((invoice) => !selectedCustomerId || invoice.customerId === selectedCustomerId)
      .map((invoice) => ({
        value: invoice.id,
        label: `${invoice.invoiceNumber} - ${invoice.currencyCode} ${invoice.balanceDue.toFixed(2)} ${t('components.customerPayments.editor.due')}`,
      })),
    [outstandingInvoices, selectedCustomerId, t],
  )

  const onSubmit = handleSubmit(async (values) => {
    const invoice = outstandingInvoices.find((item) => item.id === values.salesInvoiceId)
    const allocationError = invoice
      ? getPaymentAllocationError(invoice.balanceDue, values.amount, invoice.currencyCode, values.currencyCode)
      : null
    if (allocationError) {
      const field = allocationError === 'exceedsBalance' ? 'amount' : 'currencyCode'
      setError(field, { type: 'validate', message: t(`orderWorkflow.paymentAllocation.${allocationError}`) })
      return
    }

    try {
      const payment = await createCustomerPayment({
        customerId: values.customerId,
        salesInvoiceId: values.salesInvoiceId,
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
          const fieldName = (key.charAt(0).toLowerCase() + key.slice(1)) as keyof CustomerPaymentFormValues
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
      <VxDialogTitle>{t('components.customerPayments.editor.title')}</VxDialogTitle>
      <VxDialogContent dividers>
        <VxStack spacing={2.5} sx={{ pt: 1 }}>
          <Controller
            name="customerId"
            control={control}
            render={({ field }) => (
              <LookupSelectField
                label={t('components.customerPayments.editor.fields.customer')}
                value={field.value}
                onChange={field.onChange}
                options={customerOptions}
                error={Boolean(errors.customerId)}
                helperText={errors.customerId?.message}
                disabled={!customers.length}
                emptyText={t('components.customerPayments.editor.empty.customers')}
              />
            )}
          />

          <Controller
            name="salesInvoiceId"
            control={control}
            render={({ field }) => (
              <LookupSelectField
                label={t('components.customerPayments.editor.fields.outstandingInvoice')}
                value={field.value}
                onChange={field.onChange}
                options={invoiceOptions}
                error={Boolean(errors.salesInvoiceId)}
                helperText={errors.salesInvoiceId?.message}
                disabled={!invoiceOptions.length}
                emptyText={t('components.customerPayments.editor.empty.invoices')}
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
                  label={t('components.customerPayments.editor.fields.paymentDate')}
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
                  label={t('components.customerPayments.editor.fields.amount')}
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
                  label={t('components.customerPayments.editor.fields.currency')}
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
                  label={t('components.customerPayments.editor.fields.reference')}
                  error={Boolean(errors.referenceNumber)}
                  helperText={errors.referenceNumber?.message ?? t('components.customerPayments.editor.optional')}
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
                  label={t('components.customerPayments.editor.fields.paymentMethod')}
                  error={Boolean(errors.paymentMethod)}
                  helperText={errors.paymentMethod?.message ?? t('components.customerPayments.editor.optional')}
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
                label={t('components.customerPayments.editor.fields.notes')}
                error={Boolean(errors.notes)}
                helperText={errors.notes?.message ?? t('components.customerPayments.editor.optional')}
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
          disabled={isSubmitting || !customers.length || !outstandingInvoices.length}
        >
          {isSubmitting ? t('components.customerPayments.editor.saving') : t('components.customerPayments.editor.recordAction')}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
    {confirmationDialog}
    </>
  )
}
