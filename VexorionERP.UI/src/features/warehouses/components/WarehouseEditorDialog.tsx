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
} from '@vexorion/ui'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useTranslation } from 'react-i18next'
import { ApiError, createWarehouse, getWarehouse, updateWarehouse } from '../../../lib/api'
import type { ValidationProblem } from '../../../types/api'
import type { WarehouseEditorDialogProps, WarehouseFormValues } from '../../../types/ui'

const defaultValues: WarehouseFormValues = {
  code: '',
  name: '',
  locationDescription: '',
  isActive: true,
}

const validationSchema: yup.ObjectSchema<WarehouseFormValues> = yup.object({
  code: yup.string().trim().required('Code is required.').max(50, 'Code must be at most 50 characters.'),
  name: yup.string().trim().required('Name is required.').min(2, 'Name must be at least 2 characters.').max(200, 'Name must be at most 200 characters.'),
  locationDescription: yup.string().max(300, 'Location description must be at most 300 characters.').defined(),
  isActive: yup.boolean().required(),
})

function normalizeServerFieldName(fieldName: string): keyof WarehouseFormValues | null {
  const normalized = fieldName.charAt(0).toLowerCase() + fieldName.slice(1)
  if (normalized in defaultValues) {
    return normalized as keyof WarehouseFormValues
  }

  return null
}

function optionalText(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export default function WarehouseEditorDialog({ open, mode, warehouseId, onClose, onSaved }: WarehouseEditorDialogProps) {
  const { t } = useTranslation()
  const [isLoadingWarehouse, setIsLoadingWarehouse] = useState(mode === 'edit' && Boolean(warehouseId))
  const [submitError, setSubmitError] = useState<string | null>(null)

  const title = useMemo(
    () => (mode === 'create' ? t('components.warehouses.editor.createTitle') : t('components.warehouses.editor.editTitle')),
    [mode, t],
  )
  const { control, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<WarehouseFormValues>({
    defaultValues,
    resolver: yupResolver(validationSchema),
  })

  useEffect(() => {
    if (mode === 'create' || !warehouseId) {
      if (mode === 'create') {
        reset(defaultValues)
      }
      return
    }

    let isMounted = true

    void getWarehouse(warehouseId)
      .then((warehouse) => {
        if (!isMounted) {
          return
        }

        reset({
          code: warehouse.code,
          name: warehouse.name,
          locationDescription: warehouse.locationDescription ?? '',
          isActive: warehouse.isActive,
        })
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return
        }

        if (error instanceof ApiError) {
          setSubmitError(error.message)
        } else {
          setSubmitError(t('components.warehouses.editor.errors.load'))
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingWarehouse(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [mode, reset, warehouseId, t])

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
      code: values.code.trim(),
      name: values.name.trim(),
      locationDescription: optionalText(values.locationDescription),
    }

    try {
      const savedWarehouse = mode === 'create'
        ? await createWarehouse(payload)
        : await updateWarehouse(warehouseId!, { ...payload, isActive: values.isActive })

      onSaved(savedWarehouse, mode)
      reset(defaultValues)
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message)
        applyServerValidation(error.validation)
      } else {
        setSubmitError(t('components.warehouses.editor.errors.save'))
      }
    }
  })

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        {isLoadingWarehouse ? (
          <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 220 }}><Stack spacing={1.5} sx={{ alignItems: 'center' }}><CircularProgress size={28} /><Typography color="text.secondary">{t('components.warehouses.editor.loading')}</Typography></Stack></Box>
        ) : (
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {submitError ? <Alert severity="error">{submitError}</Alert> : null}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller name="code" control={control} render={({ field }) => <TextField {...field} fullWidth label={t('components.warehouses.editor.fields.code')} error={Boolean(errors.code)} helperText={errors.code?.message} />} />
              <Controller name="name" control={control} render={({ field }) => <TextField {...field} fullWidth label={t('components.warehouses.editor.fields.name')} error={Boolean(errors.name)} helperText={errors.name?.message} />} />
            </Stack>
            <Controller name="locationDescription" control={control} render={({ field }) => <TextField {...field} fullWidth multiline minRows={3} label={t('components.warehouses.editor.fields.locationDescription')} error={Boolean(errors.locationDescription)} helperText={errors.locationDescription?.message ?? t('components.warehouses.editor.optional')} />} />
            {mode === 'edit' ? (
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => <FormControlLabel control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />} label={field.value ? t('components.warehouses.editor.active') : t('components.warehouses.editor.inactive')} />}
              />
            ) : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>{t('dialogs.cancel')}</Button>
        <Button onClick={() => void onSubmit()} variant="contained" disabled={isSubmitting || isLoadingWarehouse}>{isSubmitting ? t('components.warehouses.editor.saving') : mode === 'create' ? t('components.warehouses.editor.createAction') : t('components.warehouses.editor.saveAction')}</Button>
      </DialogActions>
    </Dialog>
  )
}