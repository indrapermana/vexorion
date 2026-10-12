import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  VxAlert,
  VxBox,
  VxButton,
  VxChip,
  VxCircularProgress,
  VxMenuItem,
  VxPaper,
  VxStack,
  VxTable,
  VxTableBody,
  VxTableCell,
  VxTableContainer,
  VxTableHead,
  VxTableRow,
  VxTextField,
  VxTypography,
} from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import {
  ApiError,
  getProjectCategories,
  getProjectDocumentDownload,
  getProjects,
  searchProjectDocuments,
} from '../../../lib/api'
import type {
  ManagedDocumentStatus,
  ProjectCategoryListItemResponse,
  ProjectDocumentSearchItemResponse,
  ProjectListItemResponse,
} from '../../../types/api'

const statusOptions: Array<{ value: ManagedDocumentStatus; key: string }> = [
  { value: 1, key: 'draft' },
  { value: 2, key: 'inReview' },
  { value: 3, key: 'approved' },
  { value: 4, key: 'submitted' },
  { value: 5, key: 'archived' },
  { value: 6, key: 'rejected' },
]

function formatBytes(size: number) {
  if (size <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1)
  const value = size / (1024 ** index)
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function toUtcStartOfDay(value: string) {
  return `${value}T00:00:00.000Z`
}

function toUtcEndOfDay(value: string) {
  return `${value}T23:59:59.999Z`
}

export default function ProjectDocumentsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const canView = user?.permissions.includes('project-documents.view') ?? false
  const canDownload = user?.permissions.includes('project-documents.download') ?? false

  const [rows, setRows] = useState<ProjectDocumentSearchItemResponse[]>([])
  const [projects, setProjects] = useState<ProjectListItemResponse[]>([])
  const [categories, setCategories] = useState<ProjectCategoryListItemResponse[]>([])

  const [projectId, setProjectId] = useState('')
  const [projectCategoryId, setProjectCategoryId] = useState('')
  const [status, setStatus] = useState<ManagedDocumentStatus | ''>('')
  const [tag, setTag] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const projectLabelById = useMemo(
    () => new Map(projects.map((item) => [item.id, `${item.projectNumber} - ${item.name}`])),
    [projects],
  )

  const categoryLabelById = useMemo(
    () => new Map(categories.map((item) => [item.id, `${item.code} - ${item.name}`])),
    [categories],
  )

  const load = useCallback(async () => {
    if (!canView) return

    setIsLoading(true)
    setError(null)

    try {
      const [categoryResult, projectResult, documentsResult] = await Promise.all([
        getProjectCategories(),
        getProjects(),
        searchProjectDocuments({
          projectId: projectId || undefined,
          projectCategoryId: projectCategoryId || undefined,
          status: status === '' ? undefined : status,
          tag: tag.trim() || undefined,
          searchTerm: searchTerm.trim() || undefined,
          fromUtc: fromDate ? toUtcStartOfDay(fromDate) : undefined,
          toUtc: toDate ? toUtcEndOfDay(toDate) : undefined,
        }),
      ])

      setCategories(categoryResult)
      setProjects(projectResult)
      setRows(documentsResult)
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('pages.projectDocuments.errors.load', { defaultValue: 'Unable to load documents.' }))
    } finally {
      setIsLoading(false)
    }
  }, [canView, fromDate, projectCategoryId, projectId, searchTerm, status, t, tag, toDate])

  useEffect(() => {
    void load()
  }, [load])

  if (!canView) {
    return <VxAlert severity="info">{t('pages.projectDocuments.noAccess', { defaultValue: 'You do not have permission to view documents.' })}</VxAlert>
  }

  return (
    <VxStack spacing={2}>
      {error ? <VxAlert severity="error" onClose={() => setError(null)}>{error}</VxAlert> : null}

      <VxPaper elevation={0} className="panel-card">
        <VxStack spacing={2}>
          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}>
            <VxBox>
              <VxTypography variant="h5">{t('pages.projectDocuments.title', { defaultValue: 'Document Center' })}</VxTypography>
              <VxTypography color="text.secondary" variant="body2">
                {t('pages.projectDocuments.description', { defaultValue: 'Search across project documents by project, category, date, status, and tags.' })}
              </VxTypography>
            </VxBox>
            <VxButton variant="outlined" onClick={() => void load()} disabled={isLoading}>
              {t('common.refresh', { defaultValue: 'Refresh' })}
            </VxButton>
          </VxStack>

          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={1}>
            <VxTextField
              select
              size="small"
              label={t('pages.projectDocuments.filters.project', { defaultValue: 'Project' })}
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              sx={{ minWidth: 240 }}
            >
              <VxMenuItem value="">{t('common.labels.all', { defaultValue: 'All' })}</VxMenuItem>
              {projects.map((project) => <VxMenuItem key={project.id} value={project.id}>{project.projectNumber} - {project.name}</VxMenuItem>)}
            </VxTextField>

            <VxTextField
              select
              size="small"
              label={t('pages.projectDocuments.filters.category', { defaultValue: 'Category' })}
              value={projectCategoryId}
              onChange={(event) => setProjectCategoryId(event.target.value)}
              sx={{ minWidth: 220 }}
            >
              <VxMenuItem value="">{t('common.labels.all', { defaultValue: 'All' })}</VxMenuItem>
              {categories.map((category) => <VxMenuItem key={category.id} value={category.id}>{category.code} - {category.name}</VxMenuItem>)}
            </VxTextField>

            <VxTextField
              select
              size="small"
              label={t('pages.projectDocuments.filters.status', { defaultValue: 'Status' })}
              value={status}
              onChange={(event) => setStatus(event.target.value === '' ? '' : Number(event.target.value) as ManagedDocumentStatus)}
              sx={{ minWidth: 180 }}
            >
              <VxMenuItem value="">{t('common.labels.all', { defaultValue: 'All' })}</VxMenuItem>
              {statusOptions.map((option) => <VxMenuItem key={option.value} value={option.value}>{t(`pages.projectDetails.documentsPanel.status.${option.key}`)}</VxMenuItem>)}
            </VxTextField>

            <VxTextField
              size="small"
              label={t('pages.projectDocuments.filters.tag', { defaultValue: 'Tag' })}
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              sx={{ minWidth: 180 }}
            />

            <VxTextField
              size="small"
              label={t('pages.projectDocuments.filters.search', { defaultValue: 'Search' })}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              sx={{ minWidth: 220 }}
            />
          </VxStack>

          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={1}>
            <VxTextField
              type="date"
              size="small"
              label={t('pages.projectDocuments.filters.fromDate', { defaultValue: 'From date' })}
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              sx={{ minWidth: 180 }}
            />
            <VxTextField
              type="date"
              size="small"
              label={t('pages.projectDocuments.filters.toDate', { defaultValue: 'To date' })}
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              sx={{ minWidth: 180 }}
            />
          </VxStack>

          {isLoading ? (
            <VxBox sx={{ display: 'grid', placeItems: 'center', py: 6 }}><VxCircularProgress size={28} /></VxBox>
          ) : (
            <VxTableContainer>
              <VxTable size="small">
                <VxTableHead>
                  <VxTableRow>
                    <VxTableCell>{t('pages.projectDocuments.columns.project', { defaultValue: 'Project' })}</VxTableCell>
                    <VxTableCell>{t('pages.projectDocuments.columns.category', { defaultValue: 'Category' })}</VxTableCell>
                    <VxTableCell>{t('pages.projectDetails.documentsPanel.columns.title')}</VxTableCell>
                    <VxTableCell>{t('pages.projectDetails.documentsPanel.columns.number')}</VxTableCell>
                    <VxTableCell>{t('pages.projectDetails.documentsPanel.columns.file')}</VxTableCell>
                    <VxTableCell>{t('pages.projectDetails.documentsPanel.columns.size')}</VxTableCell>
                    <VxTableCell>{t('pages.projectDetails.documentsPanel.columns.status')}</VxTableCell>
                    <VxTableCell>{t('pages.projectDocuments.columns.createdAt', { defaultValue: 'Created' })}</VxTableCell>
                    <VxTableCell align="right">{t('common.actions')}</VxTableCell>
                  </VxTableRow>
                </VxTableHead>
                <VxTableBody>
                  {rows.map((row) => (
                    <VxTableRow key={row.id} hover>
                      <VxTableCell>{projectLabelById.get(row.projectId) ?? `${row.projectNumber} - ${row.projectName}`}</VxTableCell>
                      <VxTableCell>{categoryLabelById.get(row.projectCategoryId) ?? row.projectCategoryCode}</VxTableCell>
                      <VxTableCell>{row.title}</VxTableCell>
                      <VxTableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{row.documentNumber}</VxTableCell>
                      <VxTableCell>{row.fileName}</VxTableCell>
                      <VxTableCell>{formatBytes(row.fileSizeBytes)}</VxTableCell>
                      <VxTableCell>
                        <VxChip
                          size="small"
                          variant="outlined"
                          label={t(`pages.projectDetails.documentsPanel.status.${statusOptions.find((option) => option.value === row.status)?.key ?? 'draft'}`)}
                        />
                      </VxTableCell>
                      <VxTableCell>{new Date(row.createdAtUtc).toLocaleString()}</VxTableCell>
                      <VxTableCell align="right">
                        <VxStack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                          {canDownload ? (
                            <>
                              <VxButton
                                size="small"
                                variant="text"
                                onClick={async () => {
                                  const result = await getProjectDocumentDownload(row.projectId, row.id)
                                  window.open(result.downloadUrl, '_blank', 'noopener,noreferrer')
                                }}
                              >
                                {t('pages.projectDocuments.preview', { defaultValue: 'Preview' })}
                              </VxButton>
                              <VxButton
                                size="small"
                                variant="outlined"
                                onClick={async () => {
                                  const result = await getProjectDocumentDownload(row.projectId, row.id)
                                  const anchor = window.document.createElement('a')
                                  anchor.href = result.downloadUrl
                                  anchor.target = '_blank'
                                  anchor.rel = 'noopener noreferrer'
                                  anchor.download = result.fileName
                                  window.document.body.appendChild(anchor)
                                  anchor.click()
                                  window.document.body.removeChild(anchor)
                                }}
                              >
                                {t('pages.projectDetails.documentsPanel.download')}
                              </VxButton>
                            </>
                          ) : null}
                        </VxStack>
                      </VxTableCell>
                    </VxTableRow>
                  ))}
                  {rows.length === 0 ? (
                    <VxTableRow>
                      <VxTableCell colSpan={9}>
                        <VxTypography color="text.secondary" variant="body2">
                          {t('pages.projectDocuments.noRows', { defaultValue: 'No documents found for the selected filters.' })}
                        </VxTypography>
                      </VxTableCell>
                    </VxTableRow>
                  ) : null}
                </VxTableBody>
              </VxTable>
            </VxTableContainer>
          )}
        </VxStack>
      </VxPaper>
    </VxStack>
  )
}
