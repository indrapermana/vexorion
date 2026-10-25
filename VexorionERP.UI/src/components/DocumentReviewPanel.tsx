import { useEffect, useState } from 'react'
import { VxAlert, VxBox, VxPaper, VxStack, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import DocumentAuditPanel from './DocumentAuditPanel'

export type DocumentReviewField = {
  label: string
  value: ReactNode
}

type DocumentReviewPanelProps<T> = {
  entityId: string | null
  entityName: string
  documentNumber?: string
  canViewAudit: boolean
  loadDetails: (entityId: string) => Promise<T>
  getFields: (details: T) => DocumentReviewField[]
}

export default function DocumentReviewPanel<T>({ entityId, entityName, documentNumber, canViewAudit, loadDetails, getFields }: DocumentReviewPanelProps<T>) {
  const { t } = useTranslation()
  const [details, setDetails] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCurrent = true
    if (!entityId) {
      setDetails(null)
      setError(null)
      return () => { isCurrent = false }
    }

    setDetails(null)
    setIsLoading(true)
    setError(null)
    void loadDetails(entityId)
      .then((result) => {
        if (isCurrent) setDetails(result)
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : t('orderWorkflow.review.loadError'))
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => { isCurrent = false }
  }, [entityId, loadDetails, t])

  if (!entityId) {
    return (
      <VxPaper elevation={0} className="panel-card">
        <VxTypography component="h2" variant="h6" sx={{ mb: 1 }}>{t('orderWorkflow.review.title')}</VxTypography>
        <VxTypography color="text.secondary">{t('orderWorkflow.review.selectPrompt')}</VxTypography>
      </VxPaper>
    )
  }

  const fields = details ? getFields(details) : []

  return (
    <>
      <VxPaper elevation={0} className="panel-card">
        <VxStack spacing={2}>
          <VxTypography component="h2" variant="h6">{t('orderWorkflow.review.title')}{documentNumber ? `: ${documentNumber}` : ''}</VxTypography>
          {error ? <VxAlert severity="error">{error}</VxAlert> : null}
          {isLoading ? <VxTypography color="text.secondary">{t('orderWorkflow.review.loading')}</VxTypography> : null}
          {!isLoading && !error && details ? (
            <VxBox sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
              {fields.map((field) => (
                <VxBox key={field.label} sx={{ minWidth: 0 }}>
                  <VxTypography component="div" variant="caption" color="text.secondary">{field.label}</VxTypography>
                  <VxTypography component="div" variant="body2" sx={{ overflowWrap: 'anywhere' }}>{field.value == null || field.value === '' ? '-' : field.value}</VxTypography>
                </VxBox>
              ))}
            </VxBox>
          ) : null}
        </VxStack>
      </VxPaper>
      <DocumentAuditPanel entityName={entityName} entityId={entityId} canView={canViewAudit} />
    </>
  )
}