import { useEffect, useMemo, useState } from 'react'
import { VxAlert, VxBox, VxButton, VxCircularProgress, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxFormControlLabel, VxStack, VxSwitch, VxTextField, VxTypography } from '@vexorion/ui'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useTranslation } from 'react-i18next'
import { ApiError, createCustomer, getCustomer, updateCustomer } from '../../../lib/api'
import type { ValidationProblem } from '../../../types/api'
import type { CustomerEditorDialogProps, CustomerFormValues } from '../../../types/ui'

const defaultValues: CustomerFormValues = {
  customerNumber: '',
  name: '',
  contactName: '',
  email: '',
  phoneNumber: '',
  billingAddress: '',
  shippingAddress: '',
  creditLimit: 0,
  isActive: true,
}

const validationSchema: yup.ObjectSchema<CustomerFormValues> = yup.object({
  customerNumber: yup.string().trim().required('Customer number is required.').max(50, 'Customer number must be at most 50 characters.'),
  name: yup.string().trim().required('Name is required.').min(2, 'Name must be at least 2 characters.').max(200, 'Name must be at most 200 characters.'),
  contactName: yup.string().max(150, 'Contact name must be at most 150 characters.').defined(),
  email: yup.string().email('Enter a valid email address.').max(256, 'Email must be at most 256 characters.').defined(),
  phoneNumber: yup.string().max(50, 'Phone number must be at most 50 characters.').defined(),
  billingAddress: yup.string().max(300, 'Billing address must be at most 300 characters.').defined(),
  shippingAddress: yup.string().max(300, 'Shipping address must be at most 300 characters.').defined(),
  creditLimit: yup.number().typeError('Credit limit must be a number.').min(0, 'Credit limit cannot be negative.').required('Credit limit is required.'),
  isActive: yup.boolean().required(),
})

function normalizeServerFieldName(fieldName: string): keyof CustomerFormValues | null {
  const normalized = fieldName.charAt(0).toLowerCase() + fieldName.slice(1)
  if (normalized in defaultValues) {
    return normalized as keyof CustomerFormValues
  }

  return null
}

function optionalText(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export default function CustomerEditorDialog({
  open,
  mode,
  customerId,
  onClose,
  onSaved,
}: CustomerEditorDialogProps) {
  const { t } = useTranslation()
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(mode === 'edit' && Boolean(customerId))
  const [submitError, setSubmitError] = useState<string | null>(null)

  const title = useMemo(
    () => (mode === 'create' ? t('components.customers.editor.createTitle') : t('components.customers.editor.editTitle')),
    [mode, t],
  )
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    defaultValues,
    resolver: yupResolver(validationSchema),
  })

  useEffect(() => {
    if (mode === 'create') {
      reset(defaultValues)
      return
    }

    if (!customerId) {
      return
    }

    let isMounted = true

    void getCustomer(customerId)
      .then((customer) => {
        if (!isMounted) {
          return
        }

        reset({
          customerNumber: customer.customerNumber,
          name: customer.name,
          contactName: customer.contactName ?? '',
          email: customer.email ?? '',
          phoneNumber: customer.phoneNumber ?? '',
          billingAddress: customer.billingAddress ?? '',
          shippingAddress: customer.shippingAddress ?? '',
          creditLimit: customer.creditLimit,
          isActive: customer.isActive,
        })
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return
        }

        if (error instanceof ApiError) {
          setSubmitError(error.message)
        } else {
          setSubmitError(t('components.customers.editor.errors.load'))
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingCustomer(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [customerId, mode, reset, t])

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
      customerNumber: values.customerNumber.trim(),
      name: values.name.trim(),
      contactName: optionalText(values.contactName),
      email: optionalText(values.email),
      phoneNumber: optionalText(values.phoneNumber),
      billingAddress: optionalText(values.billingAddress),
      shippingAddress: optionalText(values.shippingAddress),
      creditLimit: values.creditLimit,
    }

    try {
      const savedCustomer =
        mode === 'create'
          ? await createCustomer(payload)
          : await updateCustomer(customerId!, { ...payload, isActive: values.isActive })

      onSaved(savedCustomer, mode)
      reset(defaultValues)
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message)
        applyServerValidation(error.validation)
      } else {
        setSubmitError(t('components.customers.editor.errors.save'))
      }
    }
  })

  return (
    <VxDialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="md">
      <VxDialogTitle>{title}</VxDialogTitle>
      <VxDialogContent dividers>
        {isLoadingCustomer ? (
          <VxBox sx={{ display: 'grid', placeItems: 'center', minHeight: 220 }}>
            <VxStack spacing={1.5} sx={{ alignItems: 'center' }}>
              <VxCircularProgress size={28} />
              <VxTypography color="text.secondary">{t('components.customers.editor.loading')}</VxTypography>
            </VxStack>
          </VxBox>
        ) : (
          <VxStack spacing={2.5} sx={{ pt: 1 }}>
            {submitError ? <VxAlert severity="error">{submitError}</VxAlert> : null}

            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller
                name="customerNumber"
                control={control}
                render={({ field }) => (
                  <VxTextField
                    {...field}
                    fullWidth
                    label={t('components.customers.editor.fields.customerNumber')}
                    error={Boolean(errors.customerNumber)}
                    helperText={errors.customerNumber?.message}
                  />
                )}
              />
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <VxTextField
                    {...field}
                    fullWidth
                    label={t('components.customers.editor.fields.name')}
                    error={Boolean(errors.name)}
                    helperText={errors.name?.message}
                  />
                )}
              />
            </VxStack>

            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller
                name="contactName"
                control={control}
                render={({ field }) => (
                  <VxTextField
                    {...field}
                    fullWidth
                    label={t('components.customers.editor.fields.contactName')}
                    error={Boolean(errors.contactName)}
                    helperText={errors.contactName?.message ?? t('components.customers.editor.optional')}
                  />
                )}
              />
              <Controller
                name="phoneNumber"
                control={control}
                render={({ field }) => (
                  <VxTextField
                    {...field}
                    fullWidth
                    label={t('components.customers.editor.fields.phoneNumber')}
                    error={Boolean(errors.phoneNumber)}
                    helperText={errors.phoneNumber?.message ?? t('components.customers.editor.optional')}
                  />
                )}
              />
            </VxStack>

            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <VxTextField
                  {...field}
                  fullWidth
                  label={t('components.customers.editor.fields.email')}
                  error={Boolean(errors.email)}
                  helperText={errors.email?.message ?? t('components.customers.editor.optional')}
                />
              )}
            />

            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller
                name="billingAddress"
                control={control}
                render={({ field }) => (
                  <VxTextField
                    {...field}
                    fullWidth
                    multiline
                    minRows={3}
                    label={t('components.customers.editor.fields.billingAddress')}
                    error={Boolean(errors.billingAddress)}
                    helperText={errors.billingAddress?.message ?? t('components.customers.editor.optional')}
                  />
                )}
              />
              <Controller
                name="shippingAddress"
                control={control}
                render={({ field }) => (
                  <VxTextField
                    {...field}
                    fullWidth
                    multiline
                    minRows={3}
                    label={t('components.customers.editor.fields.shippingAddress')}
                    error={Boolean(errors.shippingAddress)}
                    helperText={errors.shippingAddress?.message ?? t('components.customers.editor.optional')}
                  />
                )}
              />
            </VxStack>

            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
              <Controller
                name="creditLimit"
                control={control}
                render={({ field }) => (
                  <VxTextField
                    {...field}
                    fullWidth
                    label={t('components.customers.editor.fields.creditLimit')}
                    type="number"
                    slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                    error={Boolean(errors.creditLimit)}
                    helperText={errors.creditLimit?.message}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                  />
                )}
              />

              {mode === 'edit' ? (
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <VxFormControlLabel
                      control={<VxSwitch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
                      label={field.value ? t('components.customers.editor.active') : t('components.customers.editor.inactive')}
                    />
                  )}
                />
              ) : null}
            </VxStack>
          </VxStack>
        )}
      </VxDialogContent>
      <VxDialogActions sx={{ px: 3, py: 2 }}>
        <VxButton onClick={onClose} disabled={isSubmitting}>{t('dialogs.cancel')}</VxButton>
        <VxButton onClick={() => void onSubmit()} variant="contained" disabled={isSubmitting || isLoadingCustomer}>
          {isSubmitting
            ? t('components.customers.editor.saving')
            : mode === 'create'
              ? t('components.customers.editor.createAction')
              : t('components.customers.editor.saveAction')}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}