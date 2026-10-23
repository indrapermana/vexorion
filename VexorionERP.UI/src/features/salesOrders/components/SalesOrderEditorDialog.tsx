import { useEffect, useMemo, useState } from 'react'
import { VxAlert, VxBox, VxButton, VxCircularProgress, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxFormControlLabel, VxMenuItem, VxStack, VxSwitch, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import LookupSelectField from '../../../components/LookupSelectField'
import { useUnsavedChangesPrompt } from '../../../hooks/useUnsavedChangesPrompt'
import { ApiError, createSalesOrder, getSalesOrder, updateSalesOrder } from '../../../lib/api'
import type { ValidationProblem } from '../../../types/api'
import { documentStatusOptions, type SalesOrderEditorDialogProps, type SalesOrderFormValues } from '../../../types/ui'

const defaultValues: SalesOrderFormValues = {
  orderNumber: '',
  customerId: '',
  warehouseId: '',
  orderDate: new Date().toISOString().slice(0, 10),
  requiredDate: new Date().toISOString().slice(0, 10),
  status: 1,
  currencyCode: 'USD',
  notes: '',
  isActive: true,
}

function normalizeServerFieldName(fieldName: string): keyof SalesOrderFormValues | null {
  const normalized = fieldName.charAt(0).toLowerCase() + fieldName.slice(1)
  if (normalized in defaultValues) {
    return normalized as keyof SalesOrderFormValues
  }

  return null
}

function optionalText(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export default function SalesOrderEditorDialog({ open, mode, salesOrderId, customers, warehouses, onClose, onSaved }: SalesOrderEditorDialogProps) {
  const { t } = useTranslation()
  const [isLoadingSalesOrder, setIsLoadingSalesOrder] = useState(mode === 'edit' && Boolean(salesOrderId))
  const [submitError, setSubmitError] = useState<string | null>(null)

  const title = useMemo(() => t(mode === 'create' ? 'salesOrders.editor.createTitle' : 'salesOrders.editor.editTitle'), [mode, t])
  const validationSchema: yup.ObjectSchema<SalesOrderFormValues> = useMemo(() => yup.object({
    orderNumber: yup.string().trim()
      .required(t('common.validation.required', { field: t('salesOrders.editor.fields.orderNumber') }))
      .max(50, t('common.validation.maxLength', { field: t('salesOrders.editor.fields.orderNumber'), count: 50 })),
    customerId: yup.string().trim().required(t('common.validation.required', { field: t('salesOrders.editor.fields.customer') })),
    warehouseId: yup.string().trim().required(t('common.validation.required', { field: t('salesOrders.editor.fields.warehouse') })),
    orderDate: yup.string().required(t('common.validation.required', { field: t('salesOrders.editor.fields.orderDate') })),
    requiredDate: yup.string().required(t('common.validation.required', { field: t('salesOrders.editor.fields.requiredDate') })),
    status: yup.number().oneOf(documentStatusOptions.map((option) => option.value)).required(t('common.validation.required', { field: t('salesOrders.editor.fields.status') })),
    currencyCode: yup.string().trim()
      .required(t('common.validation.required', { field: t('salesOrders.editor.fields.currencyCode') }))
      .length(3, t('common.validation.exactLength', { field: t('salesOrders.editor.fields.currencyCode'), count: 3 })),
    notes: yup.string().max(1000, t('common.validation.notesMaxLength', { count: 1000 })).defined(),
    isActive: yup.boolean().required(),
  }), [t])
  const { control, handleSubmit, reset, setError, formState: { errors, isSubmitting, isDirty } } = useForm<SalesOrderFormValues>({
    defaultValues,
    resolver: yupResolver(validationSchema),
  })
  const { requestClose, confirmationDialog } = useUnsavedChangesPrompt(open && isDirty, isSubmitting, onClose, () => reset())

  useEffect(() => {
    if (mode === 'create' || !salesOrderId) {
      if (mode === 'create') {
        reset(defaultValues)
      }
      return
    }

    let isMounted = true

    void getSalesOrder(salesOrderId)
      .then((salesOrder) => {
        if (!isMounted) {
          return
        }

        reset({
          orderNumber: salesOrder.orderNumber,
          customerId: salesOrder.customerId,
          warehouseId: salesOrder.warehouseId,
          orderDate: salesOrder.orderDate,
          requiredDate: salesOrder.requiredDate,
          status: salesOrder.status,
          currencyCode: salesOrder.currencyCode,
          notes: salesOrder.notes ?? '',
          isActive: salesOrder.isActive,
        })
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return
        }

        if (error instanceof ApiError) {
          setSubmitError(error.message)
        } else {
          setSubmitError(t('salesOrders.editor.loadError'))
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingSalesOrder(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [mode, reset, salesOrderId, t])

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
  const warehouseOptions = warehouses.map((warehouse) => ({ value: warehouse.id, label: `${warehouse.name} (${warehouse.code})` }))

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)

    const payload = {
      orderNumber: values.orderNumber.trim(),
      customerId: values.customerId,
      warehouseId: values.warehouseId,
      orderDate: values.orderDate,
      requiredDate: values.requiredDate,
      status: values.status,
      currencyCode: values.currencyCode.trim().toUpperCase(),
      notes: optionalText(values.notes),
    }

    try {
      const savedSalesOrder = mode === 'create'
        ? await createSalesOrder(payload)
        : await updateSalesOrder(salesOrderId!, { ...payload, isActive: values.isActive })

      onSaved(savedSalesOrder, mode)
      reset(defaultValues)
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message)
        applyServerValidation(error.validation)
      } else {
        setSubmitError(t('salesOrders.editor.saveError'))
      }
    }
  })

  return (
    <>
    <VxDialog open={open} onClose={requestClose} fullWidth maxWidth="md">
      <VxDialogTitle>{title}</VxDialogTitle>
      <VxDialogContent dividers>
        {isLoadingSalesOrder ? (
          <VxBox sx={{ display: 'grid', placeItems: 'center', minHeight: 220 }}><VxStack spacing={1.5} sx={{ alignItems: 'center' }}><VxCircularProgress size={28} />          <VxTypography color="text.secondary">{t('salesOrders.editor.loading')}</VxTypography></VxStack></VxBox>
        ) : (
          <VxStack spacing={2.5} sx={{ pt: 1 }}>
            {submitError ? <VxAlert severity="error">{submitError}</VxAlert> : null}
            {!customers.length ? <VxAlert severity="warning">{t('salesOrders.createCustomerFirst')}</VxAlert> : null}
            {!warehouses.length ? <VxAlert severity="warning">{t('salesOrders.createWarehouseFirst')}</VxAlert> : null}
            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller name="orderNumber" control={control} render={({ field }) => <VxTextField {...field} fullWidth label={t('salesOrders.editor.fields.orderNumber')} error={Boolean(errors.orderNumber)} helperText={errors.orderNumber?.message} />} />
              <Controller name="currencyCode" control={control} render={({ field }) => <VxTextField {...field} fullWidth label={t('salesOrders.editor.fields.currencyCode')} error={Boolean(errors.currencyCode)} helperText={errors.currencyCode?.message} slotProps={{ htmlInput: { maxLength: 3 } }} />} />
            </VxStack>
            <Controller name="customerId" control={control} render={({ field }) => <LookupSelectField label={t('salesOrders.editor.fields.customer')} value={field.value} onChange={field.onChange} options={customerOptions} error={Boolean(errors.customerId)} helperText={errors.customerId?.message} disabled={!customers.length} emptyText={t('salesOrders.createCustomerFirst')} requiredText={t('common.required')} />} />
            <Controller name="warehouseId" control={control} render={({ field }) => <LookupSelectField label={t('salesOrders.editor.fields.warehouse')} value={field.value} onChange={field.onChange} options={warehouseOptions} error={Boolean(errors.warehouseId)} helperText={errors.warehouseId?.message} disabled={!warehouses.length} emptyText={t('salesOrders.createWarehouseFirst')} requiredText={t('common.required')} />} />
            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller name="orderDate" control={control} render={({ field }) => <VxTextField {...field} fullWidth type="date" label={t('salesOrders.editor.fields.orderDate')} slotProps={{ inputLabel: { shrink: true } }} error={Boolean(errors.orderDate)} helperText={errors.orderDate?.message} />} />
              <Controller name="requiredDate" control={control} render={({ field }) => <VxTextField {...field} fullWidth type="date" label={t('salesOrders.editor.fields.requiredDate')} slotProps={{ inputLabel: { shrink: true } }} error={Boolean(errors.requiredDate)} helperText={errors.requiredDate?.message} />} />
            </VxStack>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <VxTextField {...field} fullWidth select label={t('salesOrders.editor.fields.status')} error={Boolean(errors.status)} helperText={errors.status?.message} onChange={(event) => field.onChange(Number(event.target.value))}>
                  {documentStatusOptions.map((option) => <VxMenuItem key={option.value} value={option.value}>{t(`common.documentStatuses.${option.value}`)}</VxMenuItem>)}
                </VxTextField>
              )}
            />
            <Controller name="notes" control={control} render={({ field }) => <VxTextField {...field} fullWidth multiline minRows={3} label={t('salesOrders.editor.fields.notes')} error={Boolean(errors.notes)} helperText={errors.notes?.message ?? t('common.optional')} />} />
            {mode === 'edit' ? (
              <Controller name="isActive" control={control} render={({ field }) => <VxFormControlLabel control={<VxSwitch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />} label={field.value ? t('salesOrders.editor.fields.active') : t('salesOrders.editor.fields.inactive')} />} />
            ) : null}
          </VxStack>
        )}
      </VxDialogContent>
      <VxDialogActions sx={{ px: 3, py: 2 }}>
        <VxButton onClick={requestClose} disabled={isSubmitting}>{t('common.cancel')}</VxButton>
        <VxButton onClick={() => void onSubmit()} variant="contained" disabled={isSubmitting || isLoadingSalesOrder || customers.length === 0 || warehouses.length === 0}>{isSubmitting ? t('common.saving') : mode === 'create' ? t('salesOrders.editor.createButton') : t('common.saveChanges')}</VxButton>
      </VxDialogActions>
    </VxDialog>
    {confirmationDialog}
    </>
  )
}