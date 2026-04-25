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
  const [isLoadingSupplier, setIsLoadingSupplier] = useState(mode === 'edit' && Boolean(supplierId))
  const [submitError, setSubmitError] = useState<string | null>(null)

  const title = useMemo(() => (mode === 'create' ? 'Create supplier' : 'Edit supplier'), [mode])
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
          setSubmitError('Unable to load supplier details.')
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
  }, [mode, reset, supplierId])

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
        setSubmitError('Unable to save supplier right now.')
      }
    }
  })

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        {isLoadingSupplier ? (
          <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 220 }}>
            <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
              <CircularProgress size={28} />
              <Typography color="text.secondary">Loading supplier details...</Typography>
            </Stack>
          </Box>
        ) : (
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {submitError ? <Alert severity="error">{submitError}</Alert> : null}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller name="supplierNumber" control={control} render={({ field }) => <TextField {...field} fullWidth label="Supplier number" error={Boolean(errors.supplierNumber)} helperText={errors.supplierNumber?.message} />} />
              <Controller name="name" control={control} render={({ field }) => <TextField {...field} fullWidth label="Supplier name" error={Boolean(errors.name)} helperText={errors.name?.message} />} />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller name="contactName" control={control} render={({ field }) => <TextField {...field} fullWidth label="Contact name" error={Boolean(errors.contactName)} helperText={errors.contactName?.message ?? 'Optional'} />} />
              <Controller name="phoneNumber" control={control} render={({ field }) => <TextField {...field} fullWidth label="Phone number" error={Boolean(errors.phoneNumber)} helperText={errors.phoneNumber?.message ?? 'Optional'} />} />
            </Stack>

            <Controller name="email" control={control} render={({ field }) => <TextField {...field} fullWidth label="Email" error={Boolean(errors.email)} helperText={errors.email?.message ?? 'Optional'} />} />
            <Controller name="address" control={control} render={({ field }) => <TextField {...field} fullWidth multiline minRows={3} label="Address" error={Boolean(errors.address)} helperText={errors.address?.message ?? 'Optional'} />} />
            <Controller name="paymentTerms" control={control} render={({ field }) => <TextField {...field} fullWidth label="Payment terms" error={Boolean(errors.paymentTerms)} helperText={errors.paymentTerms?.message ?? 'Optional'} />} />

            {mode === 'edit' ? (
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
                    label={field.value ? 'Supplier is active' : 'Supplier is inactive'}
                  />
                )}
              />
            ) : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button onClick={() => void onSubmit()} variant="contained" disabled={isSubmitting || isLoadingSupplier}>
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create supplier' : 'Save changes'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}