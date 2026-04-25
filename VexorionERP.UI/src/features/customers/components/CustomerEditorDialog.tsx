import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
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
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(mode === 'edit' && Boolean(customerId))
  const [submitError, setSubmitError] = useState<string | null>(null)

  const title = useMemo(() => (mode === 'create' ? 'Create customer' : 'Edit customer'), [mode])
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
          setSubmitError('Unable to load customer details.')
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
  }, [customerId, mode, reset])

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
        setSubmitError('Unable to save customer right now.')
      }
    }
  })

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        {isLoadingCustomer ? (
          <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 220 }}>
            <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
              <CircularProgress size={28} />
              <Typography color="text.secondary">Loading customer details...</Typography>
            </Stack>
          </Box>
        ) : (
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {submitError ? <Alert severity="error">{submitError}</Alert> : null}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller
                name="customerNumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Customer number"
                    error={Boolean(errors.customerNumber)}
                    helperText={errors.customerNumber?.message}
                  />
                )}
              />
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Customer name"
                    error={Boolean(errors.name)}
                    helperText={errors.name?.message}
                  />
                )}
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller
                name="contactName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Contact name"
                    error={Boolean(errors.contactName)}
                    helperText={errors.contactName?.message ?? 'Optional'}
                  />
                )}
              />
              <Controller
                name="phoneNumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Phone number"
                    error={Boolean(errors.phoneNumber)}
                    helperText={errors.phoneNumber?.message ?? 'Optional'}
                  />
                )}
              />
            </Stack>

            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Email"
                  error={Boolean(errors.email)}
                  helperText={errors.email?.message ?? 'Optional'}
                />
              )}
            />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller
                name="billingAddress"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    minRows={3}
                    label="Billing address"
                    error={Boolean(errors.billingAddress)}
                    helperText={errors.billingAddress?.message ?? 'Optional'}
                  />
                )}
              />
              <Controller
                name="shippingAddress"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    minRows={3}
                    label="Shipping address"
                    error={Boolean(errors.shippingAddress)}
                    helperText={errors.shippingAddress?.message ?? 'Optional'}
                  />
                )}
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
              <Controller
                name="creditLimit"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Credit limit"
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
                    <FormControlLabel
                      control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
                      label={field.value ? 'Customer is active' : 'Customer is inactive'}
                    />
                  )}
                />
              ) : null}
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button onClick={() => void onSubmit()} variant="contained" disabled={isSubmitting || isLoadingCustomer}>
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create customer' : 'Save changes'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}