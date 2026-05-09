import { useEffect, useMemo, useState } from 'react'
import { VxAlert, VxBox, VxButton, VxCircularProgress, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxFormControlLabel, VxStack, VxSwitch, VxTextField, VxTypography } from '@vexorion/ui'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useTranslation } from 'react-i18next'
import { ApiError, createSupplier, getSupplier, updateSupplier } from '../../../lib/api'
import type { ValidationProblem } from '../../../types/api'
import type { SupplierEditorDialogProps, SupplierFormValues } from '../../../types/ui'

const defaultValues: SupplierFormValues = {
  supplierNumber: '',
  name: '',
  contactName: '',
  email: '',
  phoneNumber: '',
  address: '',
  paymentTerms: '',
  isActive: true,
}

const validationSchema: yup.ObjectSchema<SupplierFormValues> = yup.object({
  supplierNumber: yup.string().trim().required('Supplier number is required.').max(50, 'Supplier number must be at most 50 characters.'),
  name: yup.string().trim().required('Name is required.').min(2, 'Name must be at least 2 characters.').max(200, 'Name must be at most 200 characters.'),
  contactName: yup.string().max(150, 'Contact name must be at most 150 characters.').defined(),
  email: yup.string().email('Enter a valid email address.').max(256, 'Email must be at most 256 characters.').defined(),
  phoneNumber: yup.string().max(50, 'Phone number must be at most 50 characters.').defined(),
  address: yup.string().max(300, 'Address must be at most 300 characters.').defined(),
  paymentTerms: yup.string().max(100, 'Payment terms must be at most 100 characters.').defined(),
  isActive: yup.boolean().required(),
})

function normalizeServerFieldName(fieldName: string): keyof SupplierFormValues | null {
  const normalized = fieldName.charAt(0).toLowerCase() + fieldName.slice(1)
  if (normalized in defaultValues) {
    return normalized as keyof SupplierFormValues
  }

  return null
}

function optionalText(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export default function SupplierEditorDialog({ open, mode, supplierId, onClose, onSaved }: SupplierEditorDialogProps) {
  const { t } = useTranslation()
  const [isLoadingSupplier, setIsLoadingSupplier] = useState(mode === 'edit' && Boolean(supplierId))
  const [submitError, setSubmitError] = useState<string | null>(null)

  const title = useMemo(
    () => (mode === 'create' ? t('components.suppliers.editor.createTitle') : t('components.suppliers.editor.editTitle')),
    [mode, t],
  )
  const { control, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<SupplierFormValues>({
    defaultValues,
    resolver: yupResolver(validationSchema),
  })

  useEffect(() => {
    if (mode === 'create' || !supplierId) {
      if (mode === 'create') {
        reset(defaultValues)
      }
      return
    }

    let isMounted = true

    void getSupplier(supplierId)
      .then((supplier) => {
        if (!isMounted) {
          return
        }

        reset({
          supplierNumber: supplier.supplierNumber,
          name: supplier.name,
          contactName: supplier.contactName ?? '',
          email: supplier.email ?? '',
          phoneNumber: supplier.phoneNumber ?? '',
          address: supplier.address ?? '',
          paymentTerms: supplier.paymentTerms ?? '',
          isActive: supplier.isActive,
        })
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return
        }

        if (error instanceof ApiError) {
          setSubmitError(error.message)
        } else {
          setSubmitError(t('components.suppliers.editor.errors.load'))
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingSupplier(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [mode, reset, supplierId, t])

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

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)

    const payload = {
      supplierNumber: values.supplierNumber.trim(),
      name: values.name.trim(),
      contactName: optionalText(values.contactName),
      email: optionalText(values.email),
      phoneNumber: optionalText(values.phoneNumber),
      address: optionalText(values.address),
      paymentTerms: optionalText(values.paymentTerms),
    }

    try {
      const savedSupplier = mode === 'create'
        ? await createSupplier(payload)
        : await updateSupplier(supplierId!, { ...payload, isActive: values.isActive })

      onSaved(savedSupplier, mode)
      reset(defaultValues)
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message)
        applyServerValidation(error.validation)
      } else {
        setSubmitError(t('components.suppliers.editor.errors.save'))
      }
    }
  })

  return (
    <VxDialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="md">
      <VxDialogTitle>{title}</VxDialogTitle>
      <VxDialogContent dividers>
        {isLoadingSupplier ? (
          <VxBox sx={{ display: 'grid', placeItems: 'center', minHeight: 220 }}>
            <VxStack spacing={1.5} sx={{ alignItems: 'center' }}>
              <VxCircularProgress size={28} />
              <VxTypography color="text.secondary">{t('components.suppliers.editor.loading')}</VxTypography>
            </VxStack>
          </VxBox>
        ) : (
          <VxStack spacing={2.5} sx={{ pt: 1 }}>
            {submitError ? <VxAlert severity="error">{submitError}</VxAlert> : null}

            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller name="supplierNumber" control={control} render={({ field }) => <VxTextField {...field} fullWidth label={t('components.suppliers.editor.fields.supplierNumber')} error={Boolean(errors.supplierNumber)} helperText={errors.supplierNumber?.message} />} />
              <Controller name="name" control={control} render={({ field }) => <VxTextField {...field} fullWidth label={t('components.suppliers.editor.fields.name')} error={Boolean(errors.name)} helperText={errors.name?.message} />} />
            </VxStack>

            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller name="contactName" control={control} render={({ field }) => <VxTextField {...field} fullWidth label={t('components.suppliers.editor.fields.contactName')} error={Boolean(errors.contactName)} helperText={errors.contactName?.message ?? t('components.suppliers.editor.optional')} />} />
              <Controller name="phoneNumber" control={control} render={({ field }) => <VxTextField {...field} fullWidth label={t('components.suppliers.editor.fields.phoneNumber')} error={Boolean(errors.phoneNumber)} helperText={errors.phoneNumber?.message ?? t('components.suppliers.editor.optional')} />} />
            </VxStack>

            <Controller name="email" control={control} render={({ field }) => <VxTextField {...field} fullWidth label={t('components.suppliers.editor.fields.email')} error={Boolean(errors.email)} helperText={errors.email?.message ?? t('components.suppliers.editor.optional')} />} />
            <Controller name="address" control={control} render={({ field }) => <VxTextField {...field} fullWidth multiline minRows={3} label={t('components.suppliers.editor.fields.address')} error={Boolean(errors.address)} helperText={errors.address?.message ?? t('components.suppliers.editor.optional')} />} />
            <Controller name="paymentTerms" control={control} render={({ field }) => <VxTextField {...field} fullWidth label={t('components.suppliers.editor.fields.paymentTerms')} error={Boolean(errors.paymentTerms)} helperText={errors.paymentTerms?.message ?? t('components.suppliers.editor.optional')} />} />

            {mode === 'edit' ? (
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <VxFormControlLabel
                    control={<VxSwitch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
                      label={field.value ? t('components.suppliers.editor.active') : t('components.suppliers.editor.inactive')}
                  />
                )}
              />
            ) : null}
          </VxStack>
        )}
      </VxDialogContent>
      <VxDialogActions sx={{ px: 3, py: 2 }}>
        <VxButton onClick={onClose} disabled={isSubmitting}>{t('dialogs.cancel')}</VxButton>
        <VxButton onClick={() => void onSubmit()} variant="contained" disabled={isSubmitting || isLoadingSupplier}>
          {isSubmitting
            ? t('components.suppliers.editor.saving')
            : mode === 'create'
              ? t('components.suppliers.editor.createAction')
              : t('components.suppliers.editor.saveAction')}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}