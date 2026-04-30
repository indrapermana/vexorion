import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, TextField } from '@mui/material'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { updateTenant } from '../../../lib/api'
import type { TenantEditorDialogProps } from '../../../types/ui'

const validationSchema = yup.object().shape({
  name: yup.string().required('Name is required').min(2, 'Name must be at least 2 characters').max(200),
  domain: yup.string().nullable(),
  isActive: yup.boolean(),
})

type FormData = {
  name: string
  domain: string | null
  isActive: boolean
}

export function TenantEditorDialog({ open, tenant, onClose, onSaved }: TenantEditorDialogProps) {
  const { t } = useTranslation()
  const [isSaving, setIsSaving] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormData>({
    resolver: yupResolver(validationSchema) as any,
    defaultValues: tenant
      ? { name: tenant.name, domain: tenant.domain ?? null, isActive: tenant.isActive }
      : { name: '', domain: null, isActive: true },
  })

  const watch_isActive = watch('isActive')

  const onSubmit = async (data: FormData) => {
    if (!tenant) return

    setIsSaving(true)
    try {
      const updated = await updateTenant(tenant.id, {
        name: data.name,
        domain: data.domain,
        isActive: data.isActive,
      })
      onSaved(updated)
      onClose()
      reset()
    } catch (error) {
      console.error('Failed to save tenant:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('components.tenants.editor.editTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField disabled label={t('components.tenants.editor.codeLabel')} value={tenant?.code ?? ''} />
          <TextField
            label={t('components.tenants.editor.nameLabel')}
            {...register('name')}
            error={!!errors.name}
            helperText={errors.name?.message}
          />
          <TextField
            label={t('components.tenants.editor.domainLabel')}
            {...register('domain')}
            error={!!errors.domain}
            helperText={errors.domain?.message}
          />
          <FormControlLabel
            control={<Checkbox {...register('isActive')} checked={watch_isActive} />}
            label={t('components.tenants.editor.activeLabel')}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('common.cancel') ?? 'Cancel'}</Button>
        <Button onClick={handleSubmit(onSubmit as any)} variant="contained" disabled={isSaving}>
          {isSaving ? t('common.saving') ?? 'Saving...' : t('common.save') ?? 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
