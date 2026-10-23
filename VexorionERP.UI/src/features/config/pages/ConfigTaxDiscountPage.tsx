import { useCallback, useEffect, useState } from 'react'
import { VxAlert, VxButton, VxConfirmActionButton, VxFormControlLabel, VxPaper, VxStack, VxSwitch, VxTable, VxTableBody, VxTableCell, VxTableHead, VxTableRow, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { Permissions } from '../../../app/authorization'
import PermissionReadOnlyAlert from '../../../components/PermissionReadOnlyAlert'
import { PageBody, PageFeedback, PageHeader } from '../../../components/PagePrimitives'
import {
  ApiError,
  createTaxCode,
  deleteTaxCode,
  getTaxCodes,
  getTenantPreferences,
  updateDiscountConfiguration,
  updateTaxCode,
} from '../../../lib/api'
import type { CreateTaxCodeRequest, TaxCodeListItemResponse } from '../../../types/api'

type TaxCodeDraft = {
  code: string
  name: string
  ratePercent: string
  isInclusive: boolean
}

const emptyTaxCodeDraft: TaxCodeDraft = {
  code: '',
  name: '',
  ratePercent: '0',
  isInclusive: false,
}

export default function ConfigTaxDiscountPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const canManageTax = user?.permissions.includes(Permissions.accounting.manage) ?? false
  const canManageDiscount = user?.permissions.includes(Permissions.organization.manage) ?? false
  const [taxCodes, setTaxCodes] = useState<TaxCodeListItemResponse[]>([])
  const [draft, setDraft] = useState<TaxCodeDraft>(emptyTaxCodeDraft)
  const [editTargetId, setEditTargetId] = useState<string | null>(null)
  const [discountConfig, setDiscountConfig] = useState({
    defaultDiscountPercent: 0,
    maxManualDiscountPercent: 25,
    allowNegativeDiscount: false,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setTaxCodes([])
      return
    }

    setError(null)
    try {
      const [codes, preferences] = await Promise.all([getTaxCodes(), getTenantPreferences()])
      setTaxCodes(codes)
      setDiscountConfig({
        defaultDiscountPercent: preferences.defaultDiscountPercent,
        maxManualDiscountPercent: preferences.maxManualDiscountPercent,
        allowNegativeDiscount: preferences.allowNegativeDiscount,
      })
    } catch (loadError) {
      if (loadError instanceof ApiError) {
        setError(loadError.message)
      } else {
        setError(t('config.taxDiscount.errors.load'))
      }
    }
  }, [isAuthenticated, t])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const clearTaxDraft = () => {
    setDraft(emptyTaxCodeDraft)
    setEditTargetId(null)
  }

  const submitTaxCode = async () => {
    if (!canManageTax) return
    setError(null)
    setFeedback(null)
    setIsSaving(true)

    const payload: CreateTaxCodeRequest = {
      code: draft.code.trim(),
      name: draft.name.trim(),
      ratePercent: Number(draft.ratePercent),
      isInclusive: draft.isInclusive,
    }

    try {
      if (editTargetId) {
        await updateTaxCode(editTargetId, payload)
        setFeedback(t('config.taxDiscount.feedback.taxUpdated'))
      } else {
        await createTaxCode(payload)
        setFeedback(t('config.taxDiscount.feedback.taxCreated'))
      }

      clearTaxDraft()
      await loadData()
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setError(saveError.message)
      } else {
        setError(t('config.taxDiscount.errors.saveTax'))
      }
    } finally {
      setIsSaving(false)
    }
  }

  const startEdit = (taxCode: TaxCodeListItemResponse) => {
    if (!canManageTax) return
    setEditTargetId(taxCode.id)
    setDraft({
      code: taxCode.code,
      name: taxCode.name,
      ratePercent: String(taxCode.ratePercent),
      isInclusive: taxCode.isInclusive,
    })
  }

  const removeTaxCode = async (taxCodeId: string) => {
    if (!canManageTax) return
    setError(null)
    setFeedback(null)
    setIsSaving(true)

    try {
      await deleteTaxCode(taxCodeId)
      setFeedback(t('config.taxDiscount.feedback.taxDeleted'))
      if (editTargetId === taxCodeId) {
        clearTaxDraft()
      }

      await loadData()
    } catch (deleteError) {
      if (deleteError instanceof ApiError) {
        setError(deleteError.message)
      } else {
        setError(t('config.taxDiscount.errors.deleteTax'))
      }
    } finally {
      setIsSaving(false)
    }
  }

  const saveDiscounts = async () => {
    if (!canManageDiscount) return
    setError(null)
    setFeedback(null)
    setIsSaving(true)

    try {
      const updated = await updateDiscountConfiguration({
        defaultDiscountPercent: Number(discountConfig.defaultDiscountPercent),
        maxManualDiscountPercent: Number(discountConfig.maxManualDiscountPercent),
        allowNegativeDiscount: discountConfig.allowNegativeDiscount,
      })

      setDiscountConfig({
        defaultDiscountPercent: updated.defaultDiscountPercent,
        maxManualDiscountPercent: updated.maxManualDiscountPercent,
        allowNegativeDiscount: updated.allowNegativeDiscount,
      })
      setFeedback(t('config.taxDiscount.feedback.discountSaved'))
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setError(saveError.message)
      } else {
        setError(t('config.taxDiscount.errors.saveDiscount'))
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAuthenticated) {
    return <VxAlert severity="info">{t('config.taxDiscount.signInRequired')}</VxAlert>
  }

  return (
    <VxStack spacing={3}>
      <PageHeader title={t('config.taxDiscount.title')} description={t('config.taxDiscount.description')} />

      <PageFeedback error={error} success={feedback} onRetry={error ? () => void loadData() : undefined} />
      {!canManageTax ? <PermissionReadOnlyAlert requiredPermission={Permissions.accounting.manage} /> : null}
      {!canManageDiscount ? <PermissionReadOnlyAlert requiredPermission={Permissions.organization.manage} /> : null}

      {canManageTax ? <VxPaper elevation={0} className="panel-card">
        <VxTypography variant="h6" sx={{ mb: 2 }}>{editTargetId ? t('config.taxDiscount.editTaxCode') : t('config.taxDiscount.newTaxCode')}</VxTypography>
        <VxStack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
          <VxTextField size="small" label={t('config.taxDiscount.fields.code')} value={draft.code} onChange={(event) => setDraft((prev) => ({ ...prev, code: event.target.value }))} />
          <VxTextField size="small" label={t('config.taxDiscount.fields.name')} value={draft.name} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} />
          <VxTextField
            size="small"
            label={t('config.taxDiscount.fields.ratePercent')}
            type="number"
            value={draft.ratePercent}
            onChange={(event) => setDraft((prev) => ({ ...prev, ratePercent: event.target.value }))}
            sx={{ width: 140 }}
          />
          <VxFormControlLabel
            control={<VxSwitch checked={draft.isInclusive} onChange={(event) => setDraft((prev) => ({ ...prev, isInclusive: event.target.checked }))} />}
            label={t('config.taxDiscount.fields.inclusive')}
          />
          <VxButton variant="contained" onClick={() => void submitTaxCode()} disabled={isSaving}>{t('config.taxDiscount.saveTaxButton')}</VxButton>
          {editTargetId ? <VxButton variant="outlined" onClick={clearTaxDraft}>{t('config.taxDiscount.cancelEdit')}</VxButton> : null}
        </VxStack>
      </VxPaper> : null}

      <PageBody>
        <VxTypography variant="h6" sx={{ mb: 1.5 }}>{t('config.taxDiscount.taxCodesSection')}</VxTypography>
        <VxTable size="small">
          <VxTableHead>
            <VxTableRow>
              <VxTableCell>{t('config.taxDiscount.columns.code')}</VxTableCell>
              <VxTableCell>{t('config.taxDiscount.columns.name')}</VxTableCell>
              <VxTableCell>{t('config.taxDiscount.columns.ratePercent')}</VxTableCell>
              <VxTableCell>{t('config.taxDiscount.columns.inclusive')}</VxTableCell>
              <VxTableCell align="right">{t('config.taxDiscount.columns.actions')}</VxTableCell>
            </VxTableRow>
          </VxTableHead>
          <VxTableBody>
            {taxCodes.map((item) => (
              <VxTableRow key={item.id}>
                <VxTableCell>{item.code}</VxTableCell>
                <VxTableCell>{item.name}</VxTableCell>
                <VxTableCell>{item.ratePercent}</VxTableCell>
                <VxTableCell>{item.isInclusive ? t('common.yes') : t('common.no')}</VxTableCell>
                <VxTableCell align="right">
                  {canManageTax ? <VxStack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                    <VxButton size="small" variant="outlined" onClick={() => startEdit(item)}>{t('common.edit')}</VxButton>
                    <VxConfirmActionButton
                      title={t('dialogs.delete')}
                      targetName={`${item.code} — ${item.name}`}
                      consequence={t('config.taxDiscount.deleteTaxConsequence')}
                      confirmLabel={t('dialogs.delete')}
                      pendingLabel={t('dialogs.deleting')}
                      onConfirm={() => removeTaxCode(item.id)}
                      buttonProps={{ size: 'small', color: 'error', variant: 'outlined' }}
                    >{t('dialogs.delete')}</VxConfirmActionButton>
                  </VxStack> : null}
                </VxTableCell>
              </VxTableRow>
            ))}
          </VxTableBody>
        </VxTable>
      </PageBody>

      <VxPaper elevation={0} className="panel-card">
        <VxTypography variant="h6" sx={{ mb: 2 }}>{t('config.taxDiscount.discountSection')}</VxTypography>
        <VxStack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
          <VxTextField
            size="small"
            type="number"
            label={t('config.taxDiscount.fields.defaultDiscountPercent')}
            value={discountConfig.defaultDiscountPercent}
            disabled={!canManageDiscount}
            onChange={(event) => setDiscountConfig((prev) => ({ ...prev, defaultDiscountPercent: Number(event.target.value) }))}
            sx={{ width: 200 }}
          />
          <VxTextField
            size="small"
            type="number"
            label={t('config.taxDiscount.fields.maxManualDiscountPercent')}
            value={discountConfig.maxManualDiscountPercent}
            disabled={!canManageDiscount}
            onChange={(event) => setDiscountConfig((prev) => ({ ...prev, maxManualDiscountPercent: Number(event.target.value) }))}
            sx={{ width: 220 }}
          />
          <VxFormControlLabel
            control={
              <VxSwitch
                checked={discountConfig.allowNegativeDiscount}
                disabled={!canManageDiscount}
                onChange={(event) => setDiscountConfig((prev) => ({ ...prev, allowNegativeDiscount: event.target.checked }))}
              />
            }
            label={t('config.taxDiscount.fields.allowNegativeDiscount')}
          />
          {canManageDiscount ? <VxButton variant="contained" onClick={() => void saveDiscounts()} disabled={isSaving}>{t('config.taxDiscount.saveDiscountButton')}</VxButton> : null}
        </VxStack>
      </VxPaper>
    </VxStack>
  )
}
