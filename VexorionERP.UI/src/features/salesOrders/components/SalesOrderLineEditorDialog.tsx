import { useEffect, useMemo, useState } from 'react'
import { VxAlert, VxButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxStack, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../../../app/CurrencyContext'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import LookupSelectField from '../../../components/LookupSelectField'
import { useUnsavedChangesPrompt } from '../../../hooks/useUnsavedChangesPrompt'
import { ApiError, getProduct } from '../../../lib/api'
import type { SalesOrderLineEditorDialogProps, SalesOrderLineFormValues } from '../../../types/ui'

const defaultValues: SalesOrderLineFormValues = {
  productId: '',
  quantity: 1,
  unitPrice: 0,
  discountAmount: 0,
  isActive: true,
}

export default function SalesOrderLineEditorDialog({ open, mode, line, products, onClose, onSaved }: SalesOrderLineEditorDialogProps) {
  const { t } = useTranslation()
  const { formatMoney } = useCurrency()
  const validationSchema: yup.ObjectSchema<SalesOrderLineFormValues> = useMemo(() => yup.object({
    productId: yup.string().required(t('common.validation.required', { field: t('pages.salesOrders.lineEditor.product') })),
    quantity: yup.number()
      .moreThan(0, t('common.validation.greaterThanZero', { field: t('pages.salesOrders.lineEditor.quantity') }))
      .required(t('common.validation.required', { field: t('pages.salesOrders.lineEditor.quantity') })),
    unitPrice: yup.number()
      .min(0, t('common.validation.cannotBeNegative', { field: t('pages.salesOrders.lineEditor.unitPrice') }))
      .required(t('common.validation.required', { field: t('pages.salesOrders.lineEditor.unitPrice') })),
    discountAmount: yup.number()
      .min(0, t('common.validation.cannotBeNegative', { field: t('pages.salesOrders.lineEditor.discount') }))
      .required(t('common.validation.required', { field: t('pages.salesOrders.lineEditor.discount') })),
    isActive: yup.boolean().required(),
  }), [t])
  const { control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting, isDirty } } = useForm<SalesOrderLineFormValues>({ defaultValues, resolver: yupResolver(validationSchema) })
  const { requestClose, confirmationDialog } = useUnsavedChangesPrompt(open && isDirty, isSubmitting, onClose, () => reset())
  const [autofillHint, setAutofillHint] = useState<string | null>(null)
  const selectedProductId = watch('productId')

  useEffect(() => {
    reset(line ? { productId: line.productId, quantity: line.quantity, unitPrice: line.unitPrice, discountAmount: line.discountAmount, isActive: line.isActive } : defaultValues)
    setAutofillHint(null)
  }, [line, open, reset])

  useEffect(() => {
    if (!selectedProductId) {
      return
    }

    if (line?.productId === selectedProductId) {
      return
    }

    let isMounted = true

    void getProduct(selectedProductId)
      .then((product) => {
        if (!isMounted) {
          return
        }

        setValue('unitPrice', product.salesPrice)
        setAutofillHint(t('pages.salesOrders.lineEditor.autoFilledPrice', { amount: formatMoney(product.salesPrice) }))
      })
      .catch((error) => {
        if (!isMounted) {
          return
        }

        setAutofillHint(error instanceof ApiError ? error.message : t('pages.salesOrders.lineEditor.autoFillError'))
      })

    return () => {
      isMounted = false
    }
  }, [formatMoney, line?.productId, selectedProductId, setValue, t])

  const productOptions = products.map((product) => ({ value: product.id, label: `${product.name} (${product.sku})` }))

  return (
    <>
    <VxDialog open={open} onClose={requestClose} fullWidth maxWidth="sm">
      <VxDialogTitle>{t(mode === 'create' ? 'pages.salesOrders.lineEditor.createTitle' : 'pages.salesOrders.lineEditor.editTitle')}</VxDialogTitle>
      <VxDialogContent dividers>
        {!products.length ? <VxAlert severity="warning">{t('pages.salesOrders.lineEditor.createProductsFirst')}</VxAlert> : null}
        <VxStack spacing={2.5} sx={{ pt: 1 }}>
          <Controller name="productId" control={control} render={({ field }) => <LookupSelectField label={t('pages.salesOrders.lineEditor.product')} value={field.value} onChange={field.onChange} options={productOptions} error={Boolean(errors.productId)} helperText={errors.productId?.message} disabled={!products.length} emptyText={t('pages.salesOrders.lineEditor.noProducts')} requiredText={t('common.required')} />} />
          {autofillHint ? <VxTypography variant="body2" color="text.secondary">{autofillHint}</VxTypography> : null}
          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Controller name="quantity" control={control} render={({ field }) => <VxTextField {...field} fullWidth label={t('pages.salesOrders.lineEditor.quantity')} type="number" slotProps={{ htmlInput: { min: 0.01, step: '0.01' } }} error={Boolean(errors.quantity)} helperText={errors.quantity?.message} onChange={(event) => field.onChange(Number(event.target.value))} />} />
            <Controller name="unitPrice" control={control} render={({ field }) => <VxTextField {...field} fullWidth label={t('pages.salesOrders.lineEditor.unitPrice')} type="number" slotProps={{ htmlInput: { min: 0, step: '0.01' } }} error={Boolean(errors.unitPrice)} helperText={errors.unitPrice?.message} onChange={(event) => field.onChange(Number(event.target.value))} />} />
            <Controller name="discountAmount" control={control} render={({ field }) => <VxTextField {...field} fullWidth label={t('pages.salesOrders.lineEditor.discount')} type="number" slotProps={{ htmlInput: { min: 0, step: '0.01' } }} error={Boolean(errors.discountAmount)} helperText={errors.discountAmount?.message} onChange={(event) => field.onChange(Number(event.target.value))} />} />
          </VxStack>
        </VxStack>
      </VxDialogContent>
      <VxDialogActions sx={{ px: 3, py: 2 }}>
        <VxButton onClick={requestClose} disabled={isSubmitting}>{t('common.cancel')}</VxButton>
        <VxButton onClick={() => void handleSubmit(async (values) => { await onSaved(mode, values) })()} variant="contained" disabled={isSubmitting || !products.length}>{isSubmitting ? t('common.saving') : mode === 'create' ? t('pages.salesOrders.lineEditor.addButton') : t('pages.salesOrders.lineEditor.saveButton')}</VxButton>
      </VxDialogActions>
    </VxDialog>
    {confirmationDialog}
    </>
  )
}