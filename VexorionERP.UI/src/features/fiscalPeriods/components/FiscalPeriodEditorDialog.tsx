import { useEffect, useMemo, useState } from 'react'
import { VxAlert, VxButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxFormControlLabel, VxStack, VxSwitch, VxTextField } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { ApiError, createFiscalPeriod, getFiscalPeriod, updateFiscalPeriod } from '../../../lib/api'
import type { FiscalPeriodEditorDialogProps, FiscalPeriodFormValues } from '../../../types/ui'

const defaultValues: FiscalPeriodFormValues = {
  periodCode: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  isClosed: false,
}

const schema: yup.ObjectSchema<FiscalPeriodFormValues> = yup.object({
  periodCode: yup.string().trim().required('Period code is required.').max(30, 'Period code must be at most 30 characters.'),
  startDate: yup.string().required('Start date is required.'),
  endDate: yup.string().required('End date is required.'),
  isClosed: yup.boolean().required(),
})

export default function FiscalPeriodEditorDialog({ open, mode, fiscalPeriodId, onClose, onSaved }: FiscalPeriodEditorDialogProps) {
  useTranslation()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(mode === 'edit')

  const title = useMemo(() => (mode === 'create' ? 'Create fiscal period' : 'Edit fiscal period'), [mode])

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FiscalPeriodFormValues>({ defaultValues, resolver: yupResolver(schema) })

  useEffect(() => {
    reset(defaultValues)
    setSubmitError(null)
    if (mode !== 'edit' || !fiscalPeriodId) {
      setIsLoading(false)
      return
    }

    let isMounted = true
    setIsLoading(true)
    void getFiscalPeriod(fiscalPeriodId)
      .then((period) => {
        if (!isMounted) return
        reset({
          periodCode: period.periodCode,
          startDate: period.startDate,
          endDate: period.endDate,
          isClosed: period.isClosed,
        })
      })
      .catch((error) => {
        if (!isMounted) return
        if (error instanceof ApiError) setSubmitError(error.message)
        else setSubmitError('Unable to load fiscal period.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [fiscalPeriodId, mode, reset])

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)

    if (values.endDate < values.startDate) {
      setError('endDate', { message: 'End date must be greater than or equal to start date.' })
      return
    }

    try {
      const payload = {
        periodCode: values.periodCode.trim(),
        startDate: values.startDate,
        endDate: values.endDate,
        isClosed: values.isClosed,
      }

      const saved = mode === 'create'
        ? await createFiscalPeriod(payload)
        : await updateFiscalPeriod(fiscalPeriodId!, payload)

      onSaved(saved, mode)
      reset(defaultValues)
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message)
        if (error.validation) {
          Object.entries(error.validation).forEach(([key, value]) => {
            if (value.length > 0) {
              const field = (key.charAt(0).toLowerCase() + key.slice(1)) as keyof FiscalPeriodFormValues
              setError(field, { message: value[0] })
            }
          })
        }
      } else {
        setSubmitError('Unable to save fiscal period.')
      }
    }
  })

  return (
    <VxDialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="sm">
      <VxDialogTitle>{title}</VxDialogTitle>
      <VxDialogContent dividers>
        <VxStack spacing={2.5} sx={{ pt: 1 }}>
          {submitError ? <VxAlert severity="error">{submitError}</VxAlert> : null}

          <Controller
            name="periodCode"
            control={control}
            render={({ field }) => (
              <VxTextField {...field} fullWidth label="Period code" error={Boolean(errors.periodCode)} helperText={errors.periodCode?.message} disabled={isLoading} />
            )}
          />

          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <VxTextField {...field} fullWidth type="date" label="Start date" slotProps={{ inputLabel: { shrink: true } }} error={Boolean(errors.startDate)} helperText={errors.startDate?.message} disabled={isLoading} />
              )}
            />
            <Controller
              name="endDate"
              control={control}
              render={({ field }) => (
                <VxTextField {...field} fullWidth type="date" label="End date" slotProps={{ inputLabel: { shrink: true } }} error={Boolean(errors.endDate)} helperText={errors.endDate?.message} disabled={isLoading} />
              )}
            />
          </VxStack>

          <Controller
            name="isClosed"
            control={control}
            render={({ field }) => (
              <VxFormControlLabel control={<VxSwitch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />} label="Closed" />
            )}
          />
        </VxStack>
      </VxDialogContent>
      <VxDialogActions sx={{ px: 3, py: 2 }}>
        <VxButton onClick={onClose} disabled={isSubmitting}>Cancel</VxButton>
        <VxButton onClick={() => void onSubmit()} variant="contained" disabled={isSubmitting || isLoading}>
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create period' : 'Save changes'}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}
