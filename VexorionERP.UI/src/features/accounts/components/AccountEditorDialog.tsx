import { useEffect, useMemo, useState } from 'react'
import { VxAlert, VxButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxFormControlLabel, VxMenuItem, VxStack, VxSwitch, VxTextField } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { ApiError, createAccount, getAccount, updateAccount } from '../../../lib/api'
import {
  accountTypeOptions,
  normalBalanceOptions,
  type AccountEditorDialogProps,
  type AccountFormValues,
} from '../../../types/ui'

const defaultValues: AccountFormValues = {
  code: '',
  name: '',
  accountType: 1,
  normalBalance: 1,
  isPostingAllowed: true,
  isActive: true,
  description: '',
}

export default function AccountEditorDialog({ open, mode, accountId, onClose, onSaved }: AccountEditorDialogProps) {
  const { t } = useTranslation()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(mode === 'edit')

  const title = mode === 'create' ? t('pages.accounts.editor.createTitle') : t('pages.accounts.editor.editTitle')
  const schema = useMemo<yup.ObjectSchema<AccountFormValues>>(() => yup.object({
    code: yup.string().trim().required(t('pages.accounts.validation.codeRequired')).max(30, t('pages.accounts.validation.codeMax')),
    name: yup.string().trim().required(t('pages.accounts.validation.nameRequired')).max(120, t('pages.accounts.validation.nameMax')),
    accountType: yup.number().required(),
    normalBalance: yup.number().required(),
    isPostingAllowed: yup.boolean().required(),
    isActive: yup.boolean().required(),
    description: yup.string().max(500, t('pages.accounts.validation.descriptionMax')).defined(),
  }), [t])

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormValues>({ defaultValues, resolver: yupResolver(schema) })

  useEffect(() => {
    reset(defaultValues)
    setSubmitError(null)
    if (mode !== 'edit' || !accountId) {
      setIsLoading(false)
      return
    }

    let isMounted = true
    setIsLoading(true)
    void getAccount(accountId)
      .then((account) => {
        if (!isMounted) return
        reset({
          code: account.code,
          name: account.name,
          accountType: account.accountType,
          normalBalance: account.normalBalance,
          isPostingAllowed: account.isPostingAllowed,
          isActive: account.isActive,
          description: account.description ?? '',
        })
      })
      .catch((error) => {
        if (!isMounted) return
        if (error instanceof ApiError) setSubmitError(error.message)
        else setSubmitError(t('pages.accounts.errors.loadDetails'))
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [accountId, mode, reset, t])

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)

    try {
      const payload = {
        code: values.code.trim(),
        name: values.name.trim(),
        accountType: values.accountType,
        normalBalance: values.normalBalance,
        isPostingAllowed: values.isPostingAllowed,
        isActive: values.isActive,
        description: values.description.trim() || null,
      }

      const saved = mode === 'create'
        ? await createAccount(payload)
        : await updateAccount(accountId!, payload)

      onSaved(saved, mode)
      reset(defaultValues)
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message)
        if (error.validation) {
          Object.entries(error.validation).forEach(([key, value]) => {
            if (value.length > 0) {
              const field = (key.charAt(0).toLowerCase() + key.slice(1)) as keyof AccountFormValues
              setError(field, { message: value[0] })
            }
          })
        }
      } else {
        setSubmitError(t('pages.accounts.errors.save'))
      }
    }
  })

  return (
    <VxDialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="md">
      <VxDialogTitle>{title}</VxDialogTitle>
      <VxDialogContent dividers>
        <VxStack spacing={2.5} sx={{ pt: 1 }}>
          {submitError ? <VxAlert severity="error">{submitError}</VxAlert> : null}

          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Controller
              name="code"
              control={control}
              render={({ field }) => (
                <VxTextField {...field} fullWidth label={t('pages.accounts.fields.code')} error={Boolean(errors.code)} helperText={errors.code?.message} disabled={isLoading} />
              )}
            />
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <VxTextField {...field} fullWidth label={t('pages.accounts.fields.name')} error={Boolean(errors.name)} helperText={errors.name?.message} disabled={isLoading} />
              )}
            />
          </VxStack>

          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Controller
              name="accountType"
              control={control}
              render={({ field }) => (
                <VxTextField select fullWidth label={t('pages.accounts.fields.accountType')} value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} disabled={isLoading}>
                  {accountTypeOptions.map((option) => (
                    <VxMenuItem key={option.value} value={option.value}>{option.label}</VxMenuItem>
                  ))}
                </VxTextField>
              )}
            />
            <Controller
              name="normalBalance"
              control={control}
              render={({ field }) => (
                <VxTextField select fullWidth label={t('pages.accounts.fields.normalBalance')} value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} disabled={isLoading}>
                  {normalBalanceOptions.map((option) => (
                    <VxMenuItem key={option.value} value={option.value}>{option.label}</VxMenuItem>
                  ))}
                </VxTextField>
              )}
            />
          </VxStack>

          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <VxTextField {...field} fullWidth label={t('pages.accounts.fields.description')} multiline minRows={3} error={Boolean(errors.description)} helperText={errors.description?.message ?? t('pages.accounts.fields.optional')} disabled={isLoading} />
            )}
          />

          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Controller
              name="isPostingAllowed"
              control={control}
              render={({ field }) => (
                <VxFormControlLabel control={<VxSwitch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />} label={t('pages.accounts.fields.postingAllowed')} />
              )}
            />
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <VxFormControlLabel control={<VxSwitch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />} label={t('common.labels.active')} />
              )}
            />
          </VxStack>
        </VxStack>
      </VxDialogContent>
      <VxDialogActions sx={{ px: 3, py: 2 }}>
        <VxButton onClick={onClose} disabled={isSubmitting}>{t('common.cancel')}</VxButton>
        <VxButton onClick={() => void onSubmit()} variant="contained" disabled={isSubmitting || isLoading}>
          {isSubmitting ? t('pages.accounts.editor.saving') : mode === 'create' ? t('pages.accounts.editor.createTitle') : t('pages.accounts.editor.saveChanges')}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}
