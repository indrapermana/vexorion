import { useEffect, useMemo, useState } from 'react'
import { VxAlert, VxButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxStack, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../../../app/CurrencyContext'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import LookupSelectField from '../../../components/LookupSelectField'
import { ApiError, getProduct } from '../../../lib/api'
import type { PurchaseOrderLineEditorDialogProps, PurchaseOrderLineFormValues } from '../../../types/ui'

const defaultValues: PurchaseOrderLineFormValues = {
  productId: '',
  quantity: 1,
  unitCost: 0,
  isActive: true,
}

export default function PurchaseOrderLineEditorDialog({ open, mode, line, products, onClose, onSaved }: PurchaseOrderLineEditorDialogProps) {
  const { t } = useTranslation()
  const { formatMoney } = useCurrency()
  const validationSchema: yup.ObjectSchema<PurchaseOrderLineFormValues> = useMemo(() => yup.object({
    productId: yup.string().required(t('common.validation.required', { field: t('purchaseOrders.lineEditor.product') })),
    quantity: yup.number()
      .moreThan(0, t('common.validation.greaterThanZero', { field: t('purchaseOrders.lineEditor.quantity') }))
      .required(t('common.validation.required', { field: t('purchaseOrders.lineEditor.quantity') })),
    unitCost: yup.number()
      .min(0, t('common.validation.cannotBeNegative', { field: t('purchaseOrders.lineEditor.unitCost') }))
      .required(t('common.validation.required', { field: t('purchaseOrders.lineEditor.unitCost') })),
    isActive: yup.boolean().required(),
  }), [t])
  const { control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<PurchaseOrderLineFormValues>({ defaultValues, resolver: yupResolver(validationSchema) })
  const [autofillHint, setAutofillHint] = useState<string | null>(null)
  const selectedProductId = watch('productId')

  useEffect(() => {
    reset(line ? { productId: line.productId, quantity: line.quantity, unitCost: line.unitCost, isActive: line.isActive } : defaultValues)
    setAutofillHint(null)
  }, [line, reset])

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

        setValue('unitCost', product.standardCost)
        setAutofillHint(t('purchaseOrders.lineEditor.autoFilledCost', { amount: formatMoney(product.standardCost) }))
      })
      .catch((error) => {
        if (!isMounted) {
          return
        }

        setAutofillHint(error instanceof ApiError ? error.message : t('purchaseOrders.lineEditor.autoFillError'))
      })

    return () => {
      isMounted = false
    }
  }, [formatMoney, line?.productId, selectedProductId, setValue, t])

  const productOptions = products.map((product) => ({ value: product.id, label: `${product.name} (${product.sku})` }))

  return (
    <VxDialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="sm">
      <VxDialogTitle>{t(mode === 'create' ? 'purchaseOrders.lineEditor.createTitle' : 'purchaseOrders.lineEditor.editTitle')}</VxDialogTitle>
      <VxDialogContent dividers>
        {!products.length ? <VxAlert severity="warning">{t('purchaseOrders.lineEditor.createProductsFirst')}</VxAlert> : null}
        <VxStack spacing={2.5} sx={{ pt: 1 }}>
          <Controller name="productId" control={control} render={({ field }) => <LookupSelectField label={t('purchaseOrders.lineEditor.product')} value={field.value} onChange={field.onChange} options={productOptions} error={Boolean(errors.productId)} helperText={errors.productId?.message} disabled={!products.length} emptyText={t('purchaseOrders.lineEditor.noProducts')} requiredText={t('common.required')} />} />
          {autofillHint ? <VxTypography variant="body2" color="text.secondary">{autofillHint}</VxTypography> : null}
          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Controller name="quantity" control={control} render={({ field }) => <VxTextField {...field} fullWidth label={t('purchaseOrders.lineEditor.quantity')} type="number" slotProps={{ htmlInput: { min: 0.01, step: '0.01' } }} error={Boolean(errors.quantity)} helperText={errors.quantity?.message} onChange={(event) => field.onChange(Number(event.target.value))} />} />
            <Controller name="unitCost" control={control} render={({ field }) => <VxTextField {...field} fullWidth label={t('purchaseOrders.lineEditor.unitCost')} type="number" slotProps={{ htmlInput: { min: 0, step: '0.01' } }} error={Boolean(errors.unitCost)} helperText={errors.unitCost?.message} onChange={(event) => field.onChange(Number(event.target.value))} />} />
          </VxStack>
        </VxStack>
      </VxDialogContent>
      <VxDialogActions sx={{ px: 3, py: 2 }}>
        <VxButton onClick={onClose} disabled={isSubmitting}>{t('common.cancel')}</VxButton>
        <VxButton onClick={() => void handleSubmit(async (values) => { await onSaved(mode, values) })()} variant="contained" disabled={isSubmitting || !products.length}>{isSubmitting ? t('common.saving') : mode === 'create' ? t('purchaseOrders.lineEditor.addButton') : t('purchaseOrders.lineEditor.saveButton')}</VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}