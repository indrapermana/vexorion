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

const schema: yup.ObjectSchema<AccountFormValues> = yup.object({
  code: yup.string().trim().required('Code is required.').max(30, 'Code must be at most 30 characters.'),
  name: yup.string().trim().required('Name is required.').max(120, 'Name must be at most 120 characters.'),
  accountType: yup.number().required(),
  normalBalance: yup.number().required(),
  isPostingAllowed: yup.boolean().required(),
  isActive: yup.boolean().required(),
  description: yup.string().max(500, 'Description must be at most 500 characters.').defined(),
})

export default function AccountEditorDialog({ open, mode, accountId, onClose, onSaved }: AccountEditorDialogProps) {
  useTranslation()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(mode === 'edit')

  const title = useMemo(() => (mode === 'create' ? 'Create account' : 'Edit account'), [mode])

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
        else setSubmitError('Unable to load account details.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [accountId, mode, reset])

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
        setSubmitError('Unable to save account.')
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
                <VxTextField {...field} fullWidth label="Code" error={Boolean(errors.code)} helperText={errors.code?.message} disabled={isLoading} />
              )}
            />
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <VxTextField {...field} fullWidth label="Name" error={Boolean(errors.name)} helperText={errors.name?.message} disabled={isLoading} />
              )}
            />
          </VxStack>

          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Controller
              name="accountType"
              control={control}
              render={({ field }) => (
                <VxTextField select fullWidth label="Account type" value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} disabled={isLoading}>
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
                <VxTextField select fullWidth label="Normal balance" value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} disabled={isLoading}>
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
              <VxTextField {...field} fullWidth label="Description" multiline minRows={3} error={Boolean(errors.description)} helperText={errors.description?.message ?? 'Optional'} disabled={isLoading} />
            )}
          />

          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Controller
              name="isPostingAllowed"
              control={control}
              render={({ field }) => (
                <VxFormControlLabel control={<VxSwitch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />} label="Posting allowed" />
              )}
            />
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <VxFormControlLabel control={<VxSwitch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />} label="Active" />
              )}
            />
          </VxStack>
        </VxStack>
      </VxDialogContent>
      <VxDialogActions sx={{ px: 3, py: 2 }}>
        <VxButton onClick={onClose} disabled={isSubmitting}>Cancel</VxButton>
        <VxButton onClick={() => void onSubmit()} variant="contained" disabled={isSubmitting || isLoading}>
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create account' : 'Save changes'}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}
