import { VxButton, VxCheckbox, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxFormControlLabel, VxStack, VxTextField } from '@vexorion/ui'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { updateTenant } from '../../../lib/api'
import type { TenantEditorDialogProps } from '../../../types/ui'

const validationSchema: yup.ObjectSchema<FormData> = yup.object({
  name: yup.string().required('Name is required').min(2, 'Name must be at least 2 characters').max(200),
  domain: yup.string().nullable().defined(),
  isActive: yup.boolean().required(),
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
    resolver: yupResolver(validationSchema),
    defaultValues: tenant
      ? { name: tenant.name, domain: tenant.domain ?? null, isActive: tenant.isActive }
      : { name: '', domain: null, isActive: true },
  })

  const isActive = watch('isActive')

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
    <VxDialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <VxDialogTitle>{t('components.tenants.editor.editTitle')}</VxDialogTitle>
      <VxDialogContent>
        <VxStack spacing={2} sx={{ mt: 2 }}>
          <VxTextField disabled label={t('components.tenants.editor.codeLabel')} value={tenant?.code ?? ''} />
          <VxTextField
            label={t('components.tenants.editor.nameLabel')}
            {...register('name')}
            error={!!errors.name}
            helperText={errors.name?.message}
          />
          <VxTextField
            label={t('components.tenants.editor.domainLabel')}
            {...register('domain')}
            error={!!errors.domain}
            helperText={errors.domain?.message}
          />
          <VxFormControlLabel
            control={<VxCheckbox {...register('isActive')} checked={isActive} />}
            label={t('components.tenants.editor.activeLabel')}
          />
        </VxStack>
      </VxDialogContent>
      <VxDialogActions>
        <VxButton onClick={handleClose}>{t('common.cancel') ?? 'Cancel'}</VxButton>
        <VxButton onClick={handleSubmit(onSubmit)} variant="contained" disabled={isSaving}>
          {isSaving ? t('common.saving') ?? 'Saving...' : t('common.save') ?? 'Save'}
        </VxButton>
      </VxDialogActions>
    </VxDialog>
  )
}
