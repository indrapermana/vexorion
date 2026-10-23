import { VxAlert, VxButton, VxCheckbox, VxChip, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxFormControlLabel, VxStack, VxTextField, VxTypography } from '@vexorion/ui'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useTranslation } from 'react-i18next'
import { useEffect, useMemo, useState } from 'react'
import { ApiError, getTenantModuleEffectiveAccess, reportClientDiagnostic, updateTenant } from '../../../lib/api'
import type { TenantModuleEffectiveAccessItemResponse, TenantModuleEffectiveAccessResponse } from '../../../types/api'
import type { TenantEditorDialogProps } from '../../../types/ui'

type FormData = {
  name: string
  domain: string | null
  isActive: boolean
}

export function TenantEditorDialog({ open, tenant, onClose, onSaved }: TenantEditorDialogProps) {
  const { t } = useTranslation()
  const validationSchema = useMemo<yup.ObjectSchema<FormData>>(() => yup.object({
    name: yup.string().required(t('components.tenants.editor.validationRequired')).min(2, t('components.tenants.editor.validationMin')).max(200),
    domain: yup.string().nullable().defined(),
    isActive: yup.boolean().required(),
  }), [t])
  const [isSaving, setIsSaving] = useState(false)
  const [accessPreview, setAccessPreview] = useState<TenantModuleEffectiveAccessResponse | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
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

  useEffect(() => {
    if (!open || !tenant) {
      setAccessPreview(null)
      setPreviewError(null)
      return
    }

    let isDisposed = false
    const loadPreview = async () => {
      setIsPreviewLoading(true)
      setPreviewError(null)

      try {
        const data = await getTenantModuleEffectiveAccess(tenant.id)
        if (!isDisposed) {
          setAccessPreview(data)
        }
      } catch (error) {
        if (!isDisposed) {
          setPreviewError(t('components.tenants.editor.previewError'))
          if (!(error instanceof ApiError)) reportClientDiagnostic('operation.failed', error)
        }
      } finally {
        if (!isDisposed) {
          setIsPreviewLoading(false)
        }
      }
    }

    void loadPreview()
    return () => {
      isDisposed = true
    }
  }, [open, t, tenant])

  const renderModuleRow = (label: string, item: TenantModuleEffectiveAccessItemResponse) => (
    <VxStack key={label} direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}>
      <VxTypography variant="body2">{label}</VxTypography>
      <VxStack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        <VxChip size="small" label={t('components.tenants.editor.toggle', { state: t(item.toggleEnabled ? 'components.tenants.editor.on' : 'components.tenants.editor.off') })} color={item.toggleEnabled ? 'success' : 'default'} />
        <VxChip size="small" label={t('components.tenants.editor.rollout', { state: t(item.allowedByRollout ? 'components.tenants.editor.allow' : 'components.tenants.editor.block'), mode: item.rolloutMode })} color={item.allowedByRollout ? 'success' : 'warning'} />
        <VxChip size="small" label={t('components.tenants.editor.effective', { state: t(item.effectiveEnabled ? 'components.tenants.editor.enabled' : 'components.tenants.editor.disabled') })} color={item.effectiveEnabled ? 'success' : 'error'} />
      </VxStack>
    </VxStack>
  )

  const onSubmit = async (data: FormData) => {
    if (!tenant) return

    setIsSaving(true)
    setSaveError(null)
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
      setSaveError(error instanceof ApiError ? error.message : t('components.tenants.editor.errors.save'))
      if (!(error instanceof ApiError)) reportClientDiagnostic('operation.failed', error)
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
          {saveError ? <VxAlert severity="error" role="alert">{saveError}</VxAlert> : null}
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

          <VxStack spacing={1.25} sx={{ pt: 1 }}>
            <VxTypography component="h3" variant="subtitle2">{t('components.tenants.editor.accessPreview')}</VxTypography>
            {isPreviewLoading ? <VxTypography variant="body2" color="text.secondary">{t('components.tenants.editor.loadingPreview')}</VxTypography> : null}
            {previewError ? <VxAlert severity="warning">{previewError}</VxAlert> : null}
            {accessPreview
              ? (
                  <VxStack spacing={1.25}>
                    {renderModuleRow(t('components.tenants.editor.project'), accessPreview.project)}
                    {renderModuleRow(t('components.tenants.editor.document'), accessPreview.document)}
                    {renderModuleRow(t('components.tenants.editor.employee'), accessPreview.employee)}
                  </VxStack>
                )
              : null}
          </VxStack>
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
