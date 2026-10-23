import { useEffect, useMemo, useState } from 'react'
import { VxAlert, VxBox, VxButton, VxCircularProgress, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxFormControlLabel, VxMenuItem, VxStack, VxSwitch, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import LookupSelectField from '../../../components/LookupSelectField'
import { useUnsavedChangesPrompt } from '../../../hooks/useUnsavedChangesPrompt'
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
  const { t } = useTranslation()
  const [isLoadingPurchaseOrder, setIsLoadingPurchaseOrder] = useState(mode === 'edit' && Boolean(purchaseOrderId))
  const [submitError, setSubmitError] = useState<string | null>(null)

  const title = useMemo(() => t(mode === 'create' ? 'purchaseOrders.editor.createTitle' : 'purchaseOrders.editor.editTitle'), [mode, t])
  const validationSchema: yup.ObjectSchema<PurchaseOrderFormValues> = useMemo(() => yup.object({
    orderNumber: yup.string().trim()
      .required(t('common.validation.required', { field: t('purchaseOrders.editor.fields.orderNumber') }))
      .max(50, t('common.validation.maxLength', { field: t('purchaseOrders.editor.fields.orderNumber'), count: 50 })),
    supplierId: yup.string().trim().required(t('common.validation.required', { field: t('purchaseOrders.editor.fields.supplier') })),
    warehouseId: yup.string().trim().required(t('common.validation.required', { field: t('purchaseOrders.editor.fields.warehouse') })),
    orderDate: yup.string().required(t('common.validation.required', { field: t('purchaseOrders.editor.fields.orderDate') })),
    expectedReceiptDate: yup.string().required(t('common.validation.required', { field: t('purchaseOrders.editor.fields.expectedReceiptDate') })),
    status: yup.number().oneOf(documentStatusOptions.map((option) => option.value)).required(t('common.validation.required', { field: t('purchaseOrders.editor.fields.status') })),
    currencyCode: yup.string().trim()
      .required(t('common.validation.required', { field: t('purchaseOrders.editor.fields.currencyCode') }))
      .length(3, t('common.validation.exactLength', { field: t('purchaseOrders.editor.fields.currencyCode'), count: 3 })),
    notes: yup.string().max(1000, t('common.validation.notesMaxLength', { count: 1000 })).defined(),
    isActive: yup.boolean().required(),
  }), [t])
  const { control, handleSubmit, reset, setError, formState: { errors, isSubmitting, isDirty } } = useForm<PurchaseOrderFormValues>({ defaultValues, resolver: yupResolver(validationSchema) })
  const { requestClose, confirmationDialog } = useUnsavedChangesPrompt(open && isDirty, isSubmitting, onClose, () => reset())

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
        else setSubmitError(t('purchaseOrders.editor.loadError'))
      })
      .finally(() => {
        if (isMounted) setIsLoadingPurchaseOrder(false)
      })

    return () => {
      isMounted = false
    }
  }, [mode, purchaseOrderId, reset, t])

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
        setSubmitError(t('purchaseOrders.editor.saveError'))
      }
    }
  })

  return (
    <>
    <VxDialog open={open} onClose={requestClose} fullWidth maxWidth="md">
      <VxDialogTitle>{title}</VxDialogTitle>
      <VxDialogContent dividers>
        {isLoadingPurchaseOrder ? (
          <VxBox sx={{ display: 'grid', placeItems: 'center', minHeight: 220 }}><VxStack spacing={1.5} sx={{ alignItems: 'center' }}><VxCircularProgress size={28} />          <VxTypography color="text.secondary">{t('purchaseOrders.editor.loading')}</VxTypography></VxStack></VxBox>
        ) : (
          <VxStack spacing={2.5} sx={{ pt: 1 }}>
            {submitError ? <VxAlert severity="error">{submitError}</VxAlert> : null}
            {!suppliers.length ? <VxAlert severity="warning">{t('purchaseOrders.createSupplierFirst')}</VxAlert> : null}
            {!warehouses.length ? <VxAlert severity="warning">{t('purchaseOrders.createWarehouseFirst')}</VxAlert> : null}
            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller name="orderNumber" control={control} render={({ field }) => <VxTextField {...field} fullWidth label={t('purchaseOrders.editor.fields.orderNumber')} error={Boolean(errors.orderNumber)} helperText={errors.orderNumber?.message} />} />
              <Controller name="currencyCode" control={control} render={({ field }) => <VxTextField {...field} fullWidth label={t('purchaseOrders.editor.fields.currencyCode')} error={Boolean(errors.currencyCode)} helperText={errors.currencyCode?.message} slotProps={{ htmlInput: { maxLength: 3 } }} />} />
            </VxStack>
            <Controller name="supplierId" control={control} render={({ field }) => <LookupSelectField label={t('purchaseOrders.editor.fields.supplier')} value={field.value} onChange={field.onChange} options={supplierOptions} error={Boolean(errors.supplierId)} helperText={errors.supplierId?.message} disabled={!suppliers.length} emptyText={t('purchaseOrders.createSupplierFirst')} requiredText={t('common.required')} />} />
            <Controller name="warehouseId" control={control} render={({ field }) => <LookupSelectField label={t('purchaseOrders.editor.fields.warehouse')} value={field.value} onChange={field.onChange} options={warehouseOptions} error={Boolean(errors.warehouseId)} helperText={errors.warehouseId?.message} disabled={!warehouses.length} emptyText={t('purchaseOrders.createWarehouseFirst')} requiredText={t('common.required')} />} />
            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller name="orderDate" control={control} render={({ field }) => <VxTextField {...field} fullWidth type="date" label={t('purchaseOrders.editor.fields.orderDate')} slotProps={{ inputLabel: { shrink: true } }} error={Boolean(errors.orderDate)} helperText={errors.orderDate?.message} />} />
              <Controller name="expectedReceiptDate" control={control} render={({ field }) => <VxTextField {...field} fullWidth type="date" label={t('purchaseOrders.editor.fields.expectedReceiptDate')} slotProps={{ inputLabel: { shrink: true } }} error={Boolean(errors.expectedReceiptDate)} helperText={errors.expectedReceiptDate?.message} />} />
            </VxStack>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <VxTextField {...field} fullWidth select label={t('purchaseOrders.editor.fields.status')} error={Boolean(errors.status)} helperText={errors.status?.message} onChange={(event) => field.onChange(Number(event.target.value))}>
                  {documentStatusOptions.map((option) => <VxMenuItem key={option.value} value={option.value}>{t(`common.documentStatuses.${option.value}`)}</VxMenuItem>)}
                </VxTextField>
              )}
            />
            <Controller name="notes" control={control} render={({ field }) => <VxTextField {...field} fullWidth multiline minRows={3} label={t('purchaseOrders.editor.fields.notes')} error={Boolean(errors.notes)} helperText={errors.notes?.message ?? t('common.optional')} />} />
            {mode === 'edit' ? <Controller name="isActive" control={control} render={({ field }) => <VxFormControlLabel control={<VxSwitch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />} label={field.value ? t('purchaseOrders.editor.fields.active') : t('purchaseOrders.editor.fields.inactive')} />} /> : null}
          </VxStack>
        )}
      </VxDialogContent>
      <VxDialogActions sx={{ px: 3, py: 2 }}>
        <VxButton onClick={requestClose} disabled={isSubmitting}>{t('common.cancel')}</VxButton>
        <VxButton onClick={() => void onSubmit()} variant="contained" disabled={isSubmitting || isLoadingPurchaseOrder || suppliers.length === 0 || warehouses.length === 0}>{isSubmitting ? t('common.saving') : mode === 'create' ? t('purchaseOrders.editor.createButton') : t('common.saveChanges')}</VxButton>
      </VxDialogActions>
    </VxDialog>
    {confirmationDialog}
    </>
  )
}