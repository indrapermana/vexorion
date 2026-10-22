import { useEffect, useMemo, useState } from 'react'
import { VxAlert, VxBox, VxButton, VxCircularProgress, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxFormControlLabel, VxMenuItem, VxStack, VxSwitch, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import LookupSelectField from '../../../components/LookupSelectField'
import { ApiError, createSalesInvoice, getSalesInvoice, updateSalesInvoice } from '../../../lib/api'
import type { ValidationProblem } from '../../../types/api'
import { invoiceStatusOptions, type SalesInvoiceEditorDialogProps, type SalesInvoiceFormValues } from '../../../types/ui'

const defaultValues: SalesInvoiceFormValues = {
  invoiceNumber: '',
  customerId: '',
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date().toISOString().slice(0, 10),
  status: 1,
  currencyCode: 'USD',
  notes: '',
  isActive: true,
  sourceSalesOrderId: null,
}

function normalizeServerFieldName(fieldName: string): keyof SalesInvoiceFormValues | null {
  const normalized = fieldName.charAt(0).toLowerCase() + fieldName.slice(1)
  if (normalized in defaultValues) {
    return normalized as keyof SalesInvoiceFormValues
  }

  return null
}

function optionalText(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export default function SalesInvoiceEditorDialog({ open, mode, salesInvoiceId, customers, initialValues, onClose, onSaved }: SalesInvoiceEditorDialogProps) {
  const { t } = useTranslation()
  const [isLoadingSalesInvoice, setIsLoadingSalesInvoice] = useState(mode === 'edit' && Boolean(salesInvoiceId))
  const [submitError, setSubmitError] = useState<string | null>(null)

  const title = useMemo(() => t(mode === 'create' ? 'salesInvoices.editor.createTitle' : 'salesInvoices.editor.editTitle'), [mode, t])
  const validationSchema: yup.ObjectSchema<SalesInvoiceFormValues> = useMemo(() => yup.object({
    invoiceNumber: yup.string().trim()
      .required(t('common.validation.required', { field: t('salesInvoices.editor.fields.invoiceNumber') }))
      .max(50, t('common.validation.maxLength', { field: t('salesInvoices.editor.fields.invoiceNumber'), count: 50 })),
    customerId: yup.string().trim().required(t('common.validation.required', { field: t('salesInvoices.editor.fields.customer') })),
    invoiceDate: yup.string().required(t('common.validation.required', { field: t('salesInvoices.editor.fields.invoiceDate') })),
    dueDate: yup.string().required(t('common.validation.required', { field: t('salesInvoices.editor.fields.dueDate') })),
    status: yup.number().oneOf(invoiceStatusOptions.map((option) => option.value)).required(t('common.validation.required', { field: t('salesInvoices.editor.fields.status') })),
    currencyCode: yup.string().trim()
      .required(t('common.validation.required', { field: t('salesInvoices.editor.fields.currencyCode') }))
      .length(3, t('common.validation.exactLength', { field: t('salesInvoices.editor.fields.currencyCode'), count: 3 })),
    notes: yup.string().max(1000, t('common.validation.notesMaxLength', { count: 1000 })).defined(),
    isActive: yup.boolean().required(),
    sourceSalesOrderId: yup.string().nullable().optional().defined(),
  }), [t])
  const { control, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<SalesInvoiceFormValues>({
    defaultValues,
    resolver: yupResolver(validationSchema),
  })

  useEffect(() => {
    if (mode === 'create') {
      reset({ ...defaultValues, ...initialValues })
      setIsLoadingSalesInvoice(false)
      return
    }

    if (!salesInvoiceId) {
      return
    }

    let isMounted = true
    setIsLoadingSalesInvoice(true)

    void getSalesInvoice(salesInvoiceId)
      .then((salesInvoice) => {
        if (!isMounted) {
          return
        }

        reset({
          invoiceNumber: salesInvoice.invoiceNumber,
          customerId: salesInvoice.customerId,
          invoiceDate: salesInvoice.invoiceDate,
          dueDate: salesInvoice.dueDate,
          status: salesInvoice.status,
          currencyCode: salesInvoice.currencyCode,
          notes: salesInvoice.notes ?? '',
          isActive: salesInvoice.isActive,
          sourceSalesOrderId: salesInvoice.sourceSalesOrderId ?? null,
        })
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return
        }

        if (error instanceof ApiError) {
          setSubmitError(error.message)
        } else {
          setSubmitError(t('salesInvoices.editor.loadError'))
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingSalesInvoice(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [initialValues, mode, reset, salesInvoiceId, t])

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

  const customerOptions = customers.map((customer) => ({ value: customer.id, label: `${customer.name} (${customer.customerNumber})` }))
  const sourceLocked = mode === 'create' && Boolean(initialValues?.sourceSalesOrderId)

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)

    const payload = {
      invoiceNumber: values.invoiceNumber.trim(),
      customerId: values.customerId,
      sourceSalesOrderId: values.sourceSalesOrderId ?? null,
      sourceSalesShipmentId: null,
      invoiceDate: values.invoiceDate,
      dueDate: values.dueDate,
      paymentTermId: null,
      status: values.status,
      currencyCode: values.currencyCode.trim().toUpperCase(),
      notes: optionalText(values.notes),
    }

    try {
      const savedSalesInvoice = mode === 'create'
        ? await createSalesInvoice(payload)
        : await updateSalesInvoice(salesInvoiceId!, { ...payload, isActive: values.isActive })

      onSaved(savedSalesInvoice, mode)
      reset(defaultValues)
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message)
        applyServerValidation(error.validation)
      } else {
        setSubmitError(t('salesInvoices.editor.saveError'))
      }
    }
  })

  return (
    <VxDialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="md">
      <VxDialogTitle>{title}</VxDialogTitle>
      <VxDialogContent dividers>
        {isLoadingSalesInvoice ? (
          <VxBox sx={{ display: 'grid', placeItems: 'center', minHeight: 220 }}><VxStack spacing={1.5} sx={{ alignItems: 'center' }}><VxCircularProgress size={28} />          <VxTypography color="text.secondary">{t('salesInvoices.editor.loading')}</VxTypography></VxStack></VxBox>
        ) : (
          <VxStack spacing={2.5} sx={{ pt: 1 }}>
            {submitError ? <VxAlert severity="error">{submitError}</VxAlert> : null}
            {sourceLocked ? <VxAlert severity="info">{t('salesInvoices.editor.sourceLocked')}</VxAlert> : null}
            {!customers.length ? <VxAlert severity="warning">{t('salesInvoices.createCustomerFirst')}</VxAlert> : null}
            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller name="invoiceNumber" control={control} render={({ field }) => <VxTextField {...field} fullWidth label={t('salesInvoices.editor.fields.invoiceNumber')} error={Boolean(errors.invoiceNumber)} helperText={errors.invoiceNumber?.message} />} />
              <Controller name="currencyCode" control={control} render={({ field }) => <VxTextField {...field} fullWidth label={t('salesInvoices.editor.fields.currencyCode')} error={Boolean(errors.currencyCode)} helperText={errors.currencyCode?.message} slotProps={{ htmlInput: { maxLength: 3 } }} disabled={sourceLocked} />} />
            </VxStack>
            <Controller name="customerId" control={control} render={({ field }) => <LookupSelectField label={t('salesInvoices.editor.fields.customer')} value={field.value} onChange={field.onChange} options={customerOptions} error={Boolean(errors.customerId)} helperText={errors.customerId?.message} disabled={!customers.length || sourceLocked} emptyText={t('salesInvoices.createCustomerFirst')} requiredText={t('common.required')} />} />
            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller name="invoiceDate" control={control} render={({ field }) => <VxTextField {...field} fullWidth type="date" label={t('salesInvoices.editor.fields.invoiceDate')} slotProps={{ inputLabel: { shrink: true } }} error={Boolean(errors.invoiceDate)} helperText={errors.invoiceDate?.message} />} />
              <Controller name="dueDate" control={control} render={({ field }) => <VxTextField {...field} fullWidth type="date" label={t('salesInvoices.editor.fields.dueDate')} slotProps={{ inputLabel: { shrink: true } }} error={Boolean(errors.dueDate)} helperText={errors.dueDate?.message} />} />
            </VxStack>
            <Controller name="status" control={control} render={({ field }) => (
              <VxTextField {...field} fullWidth select label={t('salesInvoices.editor.fields.status')} error={Boolean(errors.status)} helperText={errors.status?.message} onChange={(event) => field.onChange(Number(event.target.value))}>
                {invoiceStatusOptions.map((option) => <VxMenuItem key={option.value} value={option.value}>{t(`common.invoiceStatuses.${option.value}`)}</VxMenuItem>)}
              </VxTextField>
            )} />
            <Controller name="notes" control={control} render={({ field }) => <VxTextField {...field} fullWidth multiline minRows={3} label={t('salesInvoices.editor.fields.notes')} error={Boolean(errors.notes)} helperText={errors.notes?.message ?? t('common.optional')} />} />
            {mode === 'edit' ? <Controller name="isActive" control={control} render={({ field }) => <VxFormControlLabel control={<VxSwitch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />} label={field.value ? t('salesInvoices.editor.fields.active') : t('salesInvoices.editor.fields.inactive')} />} /> : null}
          </VxStack>
        )}
      </VxDialogContent>
      <VxDialogActions sx={{ px: 3, py: 2 }}>
        <VxButton onClick={onClose} disabled={isSubmitting}>{t('common.cancel')}</VxButton>
        <VxButton onClick={() => void onSubmit()} variant="contained" disabled={isSubmitting || isLoadingSalesInvoice || customers.length === 0}>{isSubmitting ? t('common.saving') : mode === 'create' ? t('salesInvoices.editor.createButton') : t('common.saveChanges')}</VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}