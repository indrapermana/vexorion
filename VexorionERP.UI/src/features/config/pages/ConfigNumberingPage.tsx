import { useCallback, useEffect, useMemo, useState } from 'react'
import { VxAlert, VxButton, VxMenuItem, VxPaper, VxStack, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { Permissions } from '../../../app/authorization'
import PermissionReadOnlyAlert from '../../../components/PermissionReadOnlyAlert'
import { PageFeedback, PageHeader } from '../../../components/PagePrimitives'
import { ApiError, getNumberingSequences, upsertNumberingSequence } from '../../../lib/api'
import type { NumberingSequenceResponse, UpsertNumberingSequenceRequest } from '../../../types/api'

const defaults: UpsertNumberingSequenceRequest[] = [
  { documentType: 'SALES_INVOICE', prefixTemplate: 'SI-{yyyyMM}-', nextNumber: 1, numberPadding: 4, resetPeriod: 2 },
  { documentType: 'PURCHASE_INVOICE', prefixTemplate: 'PI-{yyyyMM}-', nextNumber: 1, numberPadding: 4, resetPeriod: 2 },
  { documentType: 'JOURNAL_ENTRY', prefixTemplate: 'JRN-{yyyyMMdd}-', nextNumber: 1, numberPadding: 4, resetPeriod: 3 },
]

function preview(sequence: UpsertNumberingSequenceRequest) {
  const now = new Date()
  const yyyy = String(now.getFullYear())
  const MM = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const prefix = sequence.prefixTemplate
    .replaceAll('{yyyyMMdd}', `${yyyy}${MM}${dd}`)
    .replaceAll('{yyyyMM}', `${yyyy}${MM}`)
    .replaceAll('{yyyy}', yyyy)
    .replaceAll('{MM}', MM)
    .replaceAll('{dd}', dd)
  return `${prefix}${String(sequence.nextNumber).padStart(Math.max(1, sequence.numberPadding), '0')}`
}

function toRequest(sequence: NumberingSequenceResponse): UpsertNumberingSequenceRequest {
  return {
    documentType: sequence.documentType,
    prefixTemplate: sequence.prefixTemplate,
    nextNumber: sequence.nextNumber,
    numberPadding: sequence.numberPadding,
    resetPeriod: sequence.resetPeriod,
  }
}

export default function ConfigNumberingPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const canManage = user?.permissions.includes(Permissions.billing.manage) ?? false
  const [drafts, setDrafts] = useState<UpsertNumberingSequenceRequest[]>(defaults)
  const [isLoading, setIsLoading] = useState(false)
  const [savingType, setSavingType] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return
    setIsLoading(true)
    setError(null)
    try {
      const stored = await getNumberingSequences()
      const byType = new Map(stored.map((item) => [item.documentType, toRequest(item)]))
      const known = defaults.map((item) => byType.get(item.documentType) ?? item)
      const extra = stored.filter((item) => !defaults.some((knownItem) => knownItem.documentType === item.documentType)).map(toRequest)
      setDrafts([...known, ...extra])
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('config.numbering.errors.load'))
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, t])

  useEffect(() => { void loadData() }, [loadData])

  const update = (documentType: string, change: Partial<UpsertNumberingSequenceRequest>) => {
    setDrafts((current) => current.map((item) => item.documentType === documentType ? { ...item, ...change } : item))
    setFeedback(null)
  }

  const save = async (draft: UpsertNumberingSequenceRequest) => {
    if (!canManage) return
    setSavingType(draft.documentType)
    setError(null)
    setFeedback(null)
    try {
      const saved = await upsertNumberingSequence(draft)
      update(draft.documentType, toRequest(saved))
      setFeedback(t('config.numbering.feedback.saved', { type: t(`config.numbering.documentTypes.${draft.documentType}`) }))
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : t('config.numbering.errors.save'))
    } finally {
      setSavingType(null)
    }
  }

  const resetOptions = useMemo(() => [0, 1, 2, 3] as const, [])

  if (!isAuthenticated) return <VxAlert severity="info">{t('config.numbering.signInRequired')}</VxAlert>

  return <VxStack spacing={3}>
    <PageHeader title={t('config.numbering.title')} description={t('config.numbering.description')} />
    <PageFeedback error={error} success={feedback} onRetry={error ? () => void loadData() : undefined} />
    {!canManage ? <PermissionReadOnlyAlert requiredPermission={Permissions.billing.manage} /> : null}
    <VxAlert severity="warning">{t('config.numbering.impact')}</VxAlert>
    {isLoading ? <VxTypography role="status">{t('config.numbering.loading')}</VxTypography> : null}
    {!isLoading && drafts.map((draft) => <VxPaper key={draft.documentType} elevation={0} className="panel-card">
      <VxStack spacing={1.5}>
        <VxTypography component="h2" variant="h6">{t(`config.numbering.documentTypes.${draft.documentType}`, { defaultValue: draft.documentType })}</VxTypography>
        <VxTypography variant="body2" color="text.secondary">{t(`config.numbering.effects.${draft.documentType}`, { defaultValue: t('config.numbering.effects.other') })}</VxTypography>
        <VxStack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'start' } }}>
          <VxTextField size="small" label={t('config.numbering.fields.prefixTemplate')} value={draft.prefixTemplate} disabled={!canManage} helperText={t('config.numbering.prefixHelp')} onChange={(event) => update(draft.documentType, { prefixTemplate: event.target.value })} />
          <VxTextField size="small" type="number" label={t('config.numbering.fields.nextNumber')} value={draft.nextNumber} disabled={!canManage} slotProps={{ htmlInput: { min: 1 } }} onChange={(event) => update(draft.documentType, { nextNumber: Number(event.target.value) })} />
          <VxTextField size="small" type="number" label={t('config.numbering.fields.padding')} value={draft.numberPadding} disabled={!canManage} slotProps={{ htmlInput: { min: 1, max: 12 } }} onChange={(event) => update(draft.documentType, { numberPadding: Number(event.target.value) })} />
          <VxTextField size="small" select label={t('config.numbering.fields.resetPeriod')} value={draft.resetPeriod} disabled={!canManage} sx={{ minWidth: 150 }} onChange={(event) => update(draft.documentType, { resetPeriod: Number(event.target.value) as 0 | 1 | 2 | 3 })}>
            {resetOptions.map((value) => <VxMenuItem key={value} value={value}>{t(`config.numbering.resetPeriods.${value}`)}</VxMenuItem>)}
          </VxTextField>
          {canManage ? <VxButton variant="contained" disabled={savingType !== null || draft.nextNumber < 1 || draft.numberPadding < 1 || draft.numberPadding > 12 || !draft.prefixTemplate.trim()} onClick={() => void save(draft)}>{savingType === draft.documentType ? t('common.saving') : t('common.save')}</VxButton> : null}
        </VxStack>
        <VxAlert severity="info">{t('config.numbering.preview', { value: preview(draft) })}</VxAlert>
      </VxStack>
    </VxPaper>)}
  </VxStack>
}
