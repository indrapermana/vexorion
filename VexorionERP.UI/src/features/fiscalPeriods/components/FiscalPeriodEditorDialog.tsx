import { useEffect, useMemo, useState } from 'react'
import { VxAlert, VxButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxFormControlLabel, VxStack, VxSwitch, VxTextField } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useUnsavedChangesPrompt } from '../../../hooks/useUnsavedChangesPrompt'
import { ApiError, createFiscalPeriod, getFiscalPeriod, updateFiscalPeriod } from '../../../lib/api'
import type { FiscalPeriodEditorDialogProps, FiscalPeriodFormValues } from '../../../types/ui'

const defaultValues: FiscalPeriodFormValues = {
  periodCode: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  isClosed: false,
}

export default function FiscalPeriodEditorDialog({ open, mode, fiscalPeriodId, onClose, onSaved }: FiscalPeriodEditorDialogProps) {
  const { t } = useTranslation()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(mode === 'edit')

  const title = mode === 'create' ? t('pages.fiscalPeriods.editor.createTitle') : t('pages.fiscalPeriods.editor.editTitle')
  const schema = useMemo<yup.ObjectSchema<FiscalPeriodFormValues>>(() => yup.object({
    periodCode: yup.string().trim().required(t('pages.fiscalPeriods.validation.codeRequired')).max(30, t('pages.fiscalPeriods.validation.codeMax')),
    startDate: yup.string().required(t('pages.fiscalPeriods.validation.startRequired')),
    endDate: yup.string().required(t('pages.fiscalPeriods.validation.endRequired')),
    isClosed: yup.boolean().required(),
  }), [t])

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FiscalPeriodFormValues>({ defaultValues, resolver: yupResolver(schema) })
  const { requestClose, confirmationDialog } = useUnsavedChangesPrompt(open && isDirty, isSubmitting || isLoading, onClose, () => reset())

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
        else setSubmitError(t('pages.fiscalPeriods.errors.loadDetails'))
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [fiscalPeriodId, mode, reset, t])

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)

    if (values.endDate < values.startDate) {
      setError('endDate', { message: t('pages.fiscalPeriods.validation.endAfterStart') })
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
        setSubmitError(t('pages.fiscalPeriods.errors.save'))
      }
    }
  })

  return (
    <>
    <VxDialog open={open} onClose={requestClose} fullWidth maxWidth="sm">
      <VxDialogTitle>{title}</VxDialogTitle>
      <VxDialogContent dividers>
        <VxStack spacing={2.5} sx={{ pt: 1 }}>
          {submitError ? <VxAlert severity="error">{submitError}</VxAlert> : null}

          <Controller
            name="periodCode"
            control={control}
            render={({ field }) => (
              <VxTextField {...field} fullWidth label={t('pages.fiscalPeriods.fields.periodCode')} error={Boolean(errors.periodCode)} helperText={errors.periodCode?.message} disabled={isLoading} />
            )}
          />

          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <VxTextField {...field} fullWidth type="date" label={t('pages.fiscalPeriods.fields.startDate')} slotProps={{ inputLabel: { shrink: true } }} error={Boolean(errors.startDate)} helperText={errors.startDate?.message} disabled={isLoading} />
              )}
            />
            <Controller
              name="endDate"
              control={control}
              render={({ field }) => (
                <VxTextField {...field} fullWidth type="date" label={t('pages.fiscalPeriods.fields.endDate')} slotProps={{ inputLabel: { shrink: true } }} error={Boolean(errors.endDate)} helperText={errors.endDate?.message} disabled={isLoading} />
              )}
            />
          </VxStack>

          <Controller
            name="isClosed"
            control={control}
            render={({ field }) => (
              <VxFormControlLabel control={<VxSwitch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />} label={t('pages.fiscalPeriods.grid.closed')} />
            )}
          />
        </VxStack>
      </VxDialogContent>
      <VxDialogActions sx={{ px: 3, py: 2 }}>
        <VxButton onClick={requestClose} disabled={isSubmitting}>{t('common.cancel')}</VxButton>
        <VxButton onClick={() => void onSubmit()} variant="contained" disabled={isSubmitting || isLoading}>
          {isSubmitting ? t('pages.fiscalPeriods.editor.saving') : mode === 'create' ? t('pages.fiscalPeriods.editor.createTitle') : t('pages.fiscalPeriods.editor.saveChanges')}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
    {confirmationDialog}
    </>
  )
}
