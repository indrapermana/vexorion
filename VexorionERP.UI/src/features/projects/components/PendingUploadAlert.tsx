import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { VxAlert, VxButton, VxConfirmActionButton, VxStack } from '@vexorion/ui'
import { getProjectDocuments, getProjectDocumentVersions } from '../../../lib/api'

export default function PendingUploadAlert({ pending, busy, onDiscard, onRefreshed }: {
  pending: { projectId: string, documentId?: string }, busy: boolean, onDiscard: () => void, onRefreshed?: () => Promise<unknown>,
}) {
  const { t } = useTranslation()
  const [checked, setChecked] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [failed, setFailed] = useState(false)
  return <VxStack spacing={1}>
    <VxAlert severity="warning">{t('pages.projectDetails.documentsPanel.uploadUnconfirmed')}</VxAlert>
    {failed ? <VxAlert severity="error">{t('pages.projectDetails.documentsPanel.reconcileFailed')}</VxAlert> : null}
    <VxStack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap' }}>
      <VxButton variant="outlined" component={RouterLink} to={`/projects/${encodeURIComponent(pending.projectId)}?${new URLSearchParams({ tab: 'documents', ...(pending.documentId ? { document: pending.documentId } : {}) })}`}>{t('pages.projectDetails.documentsPanel.reviewUpload')}</VxButton>
      <VxButton disabled={busy || refreshing} onClick={async () => {
        setRefreshing(true); setFailed(false); setChecked(false)
        try {
          await getProjectDocuments(pending.projectId)
          if (pending.documentId) await getProjectDocumentVersions(pending.projectId, pending.documentId)
          await onRefreshed?.()
          setChecked(true)
        } catch { setFailed(true) } finally { setRefreshing(false) }
      }}>{t('common.refresh')}</VxButton>
      <VxConfirmActionButton title={t('pages.projectDetails.documentsPanel.discardAttempt')} targetName={t('pages.projectDetails.documentsPanel.uploadAttempt')} consequence={t('pages.projectDetails.documentsPanel.duplicateWarning')} confirmLabel={t('pages.projectDetails.documentsPanel.discardAttempt')} pendingLabel={t('common.labels.loading')} buttonProps={{ disabled: busy || refreshing || !checked, variant: 'text' }} onConfirm={onDiscard}>{t('pages.projectDetails.documentsPanel.discardAttempt')}</VxConfirmActionButton>
    </VxStack>
  </VxStack>
}