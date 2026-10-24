import { useEffect, useMemo, useState } from 'react'
import { VxAlert, VxBox, VxButton, VxCircularProgress, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxFormControlLabel, VxMenuItem, VxStack, VxSwitch, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import LookupSelectField from '../../../components/LookupSelectField'
import { useUnsavedChangesPrompt } from '../../../hooks/useUnsavedChangesPrompt'
import { ApiError, createPurchaseInvoice, getPurchaseInvoice, updatePurchaseInvoice } from '../../../lib/api'
import type { ValidationProblem } from '../../../types/api'
import { invoiceStatusOptions, type PurchaseInvoiceEditorDialogProps, type PurchaseInvoiceFormValues } from '../../../types/ui'
import { useCurrency } from '../../../app/CurrencyContext'

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
  const { currencyCode: companyCurrency } = useCurrency()
  const createDefaults = useMemo(() => ({ ...defaultValues, currencyCode: companyCurrency }), [companyCurrency])
  const { t } = useTranslation()
  const [isLoadingPurchaseInvoice, setIsLoadingPurchaseInvoice] = useState(mode === 'edit' && Boolean(purchaseInvoiceId))
  const [submitError, setSubmitError] = useState<string | null>(null)

  const title = useMemo(() => t(mode === 'create' ? 'pages.purchaseInvoices.editor.createTitle' : 'pages.purchaseInvoices.editor.editTitle'), [mode, t])
  const validationSchema: yup.ObjectSchema<PurchaseInvoiceFormValues> = useMemo(() => yup.object({
    invoiceNumber: yup.string().trim()
      .required(t('common.validation.required', { field: t('pages.purchaseInvoices.editor.fields.invoiceNumber') }))
      .max(50, t('common.validation.maxLength', { field: t('pages.purchaseInvoices.editor.fields.invoiceNumber'), count: 50 })),
    supplierId: yup.string().trim().required(t('common.validation.required', { field: t('pages.purchaseInvoices.editor.fields.supplier') })),
    vendorReferenceNumber: yup.string().max(100, t('common.validation.maxLength', { field: t('pages.purchaseInvoices.editor.fields.vendorReferenceNumber'), count: 100 })).defined(),
    invoiceDate: yup.string().required(t('common.validation.required', { field: t('pages.purchaseInvoices.editor.fields.invoiceDate') })),
    dueDate: yup.string().required(t('common.validation.required', { field: t('pages.purchaseInvoices.editor.fields.dueDate') })),
    status: yup.number().oneOf(invoiceStatusOptions.map((option) => option.value)).required(t('common.validation.required', { field: t('pages.purchaseInvoices.editor.fields.status') })),
    currencyCode: yup.string().trim()
      .required(t('common.validation.required', { field: t('pages.purchaseInvoices.editor.fields.currencyCode') }))
      .length(3, t('common.validation.exactLength', { field: t('pages.purchaseInvoices.editor.fields.currencyCode'), count: 3 })),
    notes: yup.string().max(1000, t('common.validation.notesMaxLength', { count: 1000 })).defined(),
    isActive: yup.boolean().required(),
    sourcePurchaseOrderId: yup.string().nullable().optional().defined(),
  }), [t])
  const { control, handleSubmit, reset, setError, formState: { errors, isSubmitting, isDirty } } = useForm<PurchaseInvoiceFormValues>({
    defaultValues: createDefaults,
    resolver: yupResolver(validationSchema),
  })
  const { requestClose, confirmationDialog } = useUnsavedChangesPrompt(open && isDirty, isSubmitting, onClose, () => reset())

  useEffect(() => {
    if (mode === 'create') {
      reset({ ...createDefaults, ...initialValues })
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
          setSubmitError(t('pages.purchaseInvoices.editor.loadError'))
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
  }, [createDefaults, initialValues, mode, purchaseInvoiceId, reset, t])

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
      reset(createDefaults)
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message)
        applyServerValidation(error.validation)
      } else {
        setSubmitError(t('pages.purchaseInvoices.editor.saveError'))
      }
    }
  })

  return (
    <>
    <VxDialog open={open} onClose={requestClose} fullWidth maxWidth="md">
      <VxDialogTitle>{title}</VxDialogTitle>
      <VxDialogContent dividers>
        {isLoadingPurchaseInvoice ? (
          <VxBox sx={{ display: 'grid', placeItems: 'center', minHeight: 220 }}><VxStack spacing={1.5} sx={{ alignItems: 'center' }}><VxCircularProgress size={28} />          <VxTypography color="text.secondary">{t('pages.purchaseInvoices.editor.loading')}</VxTypography></VxStack></VxBox>
        ) : (
          <VxStack spacing={2.5} sx={{ pt: 1 }}>
            {submitError ? <VxAlert severity="error">{submitError}</VxAlert> : null}
            {sourceLocked ? <VxAlert severity="info">{t('pages.purchaseInvoices.editor.sourceLocked')}</VxAlert> : null}
            {!suppliers.length ? <VxAlert severity="warning">{t('pages.purchaseInvoices.createSupplierFirst')}</VxAlert> : null}
            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller name="invoiceNumber" control={control} render={({ field }) => <VxTextField {...field} fullWidth label={t('pages.purchaseInvoices.editor.fields.invoiceNumber')} error={Boolean(errors.invoiceNumber)} helperText={errors.invoiceNumber?.message} />} />
              <Controller name="currencyCode" control={control} render={({ field }) => <VxTextField {...field} fullWidth label={t('pages.purchaseInvoices.editor.fields.currencyCode')} error={Boolean(errors.currencyCode)} helperText={errors.currencyCode?.message} slotProps={{ htmlInput: { maxLength: 3 } }} disabled={sourceLocked} />} />
            </VxStack>
            <Controller name="supplierId" control={control} render={({ field }) => <LookupSelectField label={t('pages.purchaseInvoices.editor.fields.supplier')} value={field.value} onChange={field.onChange} options={supplierOptions} error={Boolean(errors.supplierId)} helperText={errors.supplierId?.message} disabled={!suppliers.length || sourceLocked} emptyText={t('pages.purchaseInvoices.createSupplierFirst')} requiredText={t('common.required')} />} />
            <Controller name="vendorReferenceNumber" control={control} render={({ field }) => <VxTextField {...field} fullWidth label={t('pages.purchaseInvoices.editor.fields.vendorReferenceNumber')} error={Boolean(errors.vendorReferenceNumber)} helperText={errors.vendorReferenceNumber?.message ?? t('common.optional')} />} />
            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller name="invoiceDate" control={control} render={({ field }) => <VxTextField {...field} fullWidth type="date" label={t('pages.purchaseInvoices.editor.fields.invoiceDate')} slotProps={{ inputLabel: { shrink: true } }} error={Boolean(errors.invoiceDate)} helperText={errors.invoiceDate?.message} />} />
              <Controller name="dueDate" control={control} render={({ field }) => <VxTextField {...field} fullWidth type="date" label={t('pages.purchaseInvoices.editor.fields.dueDate')} slotProps={{ inputLabel: { shrink: true } }} error={Boolean(errors.dueDate)} helperText={errors.dueDate?.message} />} />
            </VxStack>
            <Controller name="status" control={control} render={({ field }) => (
              <VxTextField {...field} fullWidth select label={t('pages.purchaseInvoices.editor.fields.status')} error={Boolean(errors.status)} helperText={errors.status?.message} onChange={(event) => field.onChange(Number(event.target.value))}>
                {invoiceStatusOptions.map((option) => <VxMenuItem key={option.value} value={option.value}>{t(`common.invoiceStatuses.${option.value}`)}</VxMenuItem>)}
              </VxTextField>
            )} />
            <Controller name="notes" control={control} render={({ field }) => <VxTextField {...field} fullWidth multiline minRows={3} label={t('pages.purchaseInvoices.editor.fields.notes')} error={Boolean(errors.notes)} helperText={errors.notes?.message ?? t('common.optional')} />} />
            {mode === 'edit' ? <Controller name="isActive" control={control} render={({ field }) => <VxFormControlLabel control={<VxSwitch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />} label={field.value ? t('pages.purchaseInvoices.editor.fields.active') : t('pages.purchaseInvoices.editor.fields.inactive')} />} /> : null}
          </VxStack>
        )}
      </VxDialogContent>
      <VxDialogActions sx={{ px: 3, py: 2 }}>
        <VxButton onClick={requestClose} disabled={isSubmitting}>{t('common.cancel')}</VxButton>
        <VxButton onClick={() => void onSubmit()} variant="contained" disabled={isSubmitting || isLoadingPurchaseInvoice || suppliers.length === 0}>{isSubmitting ? t('common.saving') : mode === 'create' ? t('pages.purchaseInvoices.editor.createButton') : t('common.saveChanges')}</VxButton>
      </VxDialogActions>
    </VxDialog>
    {confirmationDialog}
    </>
  )
}