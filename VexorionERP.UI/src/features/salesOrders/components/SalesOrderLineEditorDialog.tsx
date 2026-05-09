import { useEffect, useState } from 'react'
import { VxAlert, VxButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxStack, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../../../app/CurrencyContext'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import LookupSelectField from '../../../components/LookupSelectField'
import { ApiError, getProduct } from '../../../lib/api'
import type { SalesOrderLineEditorDialogProps, SalesOrderLineFormValues } from '../../../types/ui'

const defaultValues: SalesOrderLineFormValues = {
  productId: '',
  quantity: 1,
  unitPrice: 0,
  discountAmount: 0,
  isActive: true,
}

const validationSchema: yup.ObjectSchema<SalesOrderLineFormValues> = yup.object({
  productId: yup.string().required('Product is required.'),
  quantity: yup.number().moreThan(0, 'Quantity must be greater than zero.').required('Quantity is required.'),
  unitPrice: yup.number().min(0, 'Unit price cannot be negative.').required('Unit price is required.'),
  discountAmount: yup.number().min(0, 'Discount cannot be negative.').required('Discount is required.'),
  isActive: yup.boolean().required(),
})

export default function SalesOrderLineEditorDialog({ open, mode, line, products, onClose, onSaved }: SalesOrderLineEditorDialogProps) {
  useTranslation()
  const { formatMoney } = useCurrency()
  const { control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<SalesOrderLineFormValues>({ defaultValues, resolver: yupResolver(validationSchema) })
  const [autofillHint, setAutofillHint] = useState<string | null>(null)
  const selectedProductId = watch('productId')

  useEffect(() => {
    reset(line ? { productId: line.productId, quantity: line.quantity, unitPrice: line.unitPrice, discountAmount: line.discountAmount, isActive: line.isActive } : defaultValues)
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

        setValue('unitPrice', product.salesPrice)
        setAutofillHint(`Unit price auto-filled from product sales price: ${formatMoney(product.salesPrice)}`)
      })
      .catch((error) => {
        if (!isMounted) {
          return
        }

        setAutofillHint(error instanceof ApiError ? error.message : 'Unable to auto-fill product pricing.')
      })

    return () => {
      isMounted = false
    }
  }, [line?.productId, selectedProductId, setValue])

  const productOptions = products.map((product) => ({ value: product.id, label: `${product.name} (${product.sku})` }))

  return (
    <VxDialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="sm">
      <VxDialogTitle>{mode === 'create' ? 'Add sales line' : 'Edit sales line'}</VxDialogTitle>
      <VxDialogContent dividers>
        {!products.length ? <VxAlert severity="warning">Create products before adding order lines.</VxAlert> : null}
        <VxStack spacing={2.5} sx={{ pt: 1 }}>
          <Controller name="productId" control={control} render={({ field }) => <LookupSelectField label="Product" value={field.value} onChange={field.onChange} options={productOptions} error={Boolean(errors.productId)} helperText={errors.productId?.message} disabled={!products.length} emptyText="No products available" />} />
          {autofillHint ? <VxTypography variant="body2" color="text.secondary">{autofillHint}</VxTypography> : null}
          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Controller name="quantity" control={control} render={({ field }) => <VxTextField {...field} fullWidth label="Quantity" type="number" slotProps={{ htmlInput: { min: 0.01, step: '0.01' } }} error={Boolean(errors.quantity)} helperText={errors.quantity?.message} onChange={(event) => field.onChange(Number(event.target.value))} />} />
            <Controller name="unitPrice" control={control} render={({ field }) => <VxTextField {...field} fullWidth label="Unit price" type="number" slotProps={{ htmlInput: { min: 0, step: '0.01' } }} error={Boolean(errors.unitPrice)} helperText={errors.unitPrice?.message} onChange={(event) => field.onChange(Number(event.target.value))} />} />
            <Controller name="discountAmount" control={control} render={({ field }) => <VxTextField {...field} fullWidth label="Discount" type="number" slotProps={{ htmlInput: { min: 0, step: '0.01' } }} error={Boolean(errors.discountAmount)} helperText={errors.discountAmount?.message} onChange={(event) => field.onChange(Number(event.target.value))} />} />
          </VxStack>
        </VxStack>
      </VxDialogContent>
      <VxDialogActions sx={{ px: 3, py: 2 }}>
        <VxButton onClick={onClose} disabled={isSubmitting}>Cancel</VxButton>
        <VxButton onClick={() => void handleSubmit(async (values) => { await onSaved(mode, values) })()} variant="contained" disabled={isSubmitting || !products.length}>{isSubmitting ? 'Saving...' : mode === 'create' ? 'Add line' : 'Save line'}</VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}