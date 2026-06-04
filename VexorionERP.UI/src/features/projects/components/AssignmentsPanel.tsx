import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  VxAlert,
  VxBox,
  VxButton,
  VxChip,
  VxCircularProgress,
  VxDialog,
  VxDialogActions,
  VxDialogContent,
  VxDialogTitle,
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
  createProjectAssignment,
  deleteProjectAssignment,
  getProjectAssignmentHistory,
  getProjectAssignableEmployees,
  getProjectAssignableConsultants,
  getProjectAssignments,
  updateProjectAssignment,
} from '../../../lib/api'
import type {
  CreateProjectAssignmentRequest,
  EmployeeListItemResponse,
  ProjectAssignableConsultantListItemResponse,
  ProjectAssignmentHistoryItemResponse,
  ProjectAssignmentListItemResponse,
} from '../../../types/api'

type AssignmentsPanelProps = {
  projectId: string
}

type AssigneeType = 'employee' | 'consultant'

type AssignmentFormState = {
  assigneeType: AssigneeType
  assigneeId: string
  roleTitle: string
  startDate: string
  endDate: string
  isPrimaryAssignment: boolean
  notes: string
  isActive: boolean
}

const initialFormState: AssignmentFormState = {
  assigneeType: 'employee',
  assigneeId: '',
  roleTitle: '',
  startDate: '',
  endDate: '',
  isPrimaryAssignment: false,
  notes: '',
  isActive: true,
}

function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    if (error.validation) {
      const firstValidationMessage = Object.values(error.validation)
        .find((messages) => Array.isArray(messages) && messages.length > 0)?.[0]

      if (firstValidationMessage) {
        return firstValidationMessage
      }
    }

    return error.message
  }

  return fallbackMessage
}

export default function AssignmentsPanel({ projectId }: AssignmentsPanelProps) {
  const { t } = useTranslation()
  const { user } = useAuth()

  const canView = user?.permissions.includes('projects.view') ?? false
  const canManage = user?.permissions.includes('projects.manage') ?? false

  const [assignments, setAssignments] = useState<ProjectAssignmentListItemResponse[]>([])
  const [historyItems, setHistoryItems] = useState<ProjectAssignmentHistoryItemResponse[]>([])
  const [employees, setEmployees] = useState<EmployeeListItemResponse[]>([])
  const [consultants, setConsultants] = useState<ProjectAssignableConsultantListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ProjectAssignmentListItemResponse | null>(null)
  const [formState, setFormState] = useState<AssignmentFormState>(initialFormState)

  const loadData = useCallback(async () => {
    if (!canView) return

    setIsLoading(true)
    setError(null)

    try {
      const [assignmentResult, historyResult] = await Promise.all([
        getProjectAssignments(projectId),
        getProjectAssignmentHistory(projectId),
      ])

      setAssignments(assignmentResult)
      setHistoryItems(historyResult)

      const [employeeResult, consultantResult] = await Promise.all([
        getProjectAssignableEmployees(projectId),
        getProjectAssignableConsultants(projectId),
      ])
      setEmployees(employeeResult.filter((item) => item.isActive))
      setConsultants(consultantResult.filter((item) => item.isActive))
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, t('pages.projectDetails.assignmentsPanel.errors.load')))
    } finally {
      setIsLoading(false)
    }
  }, [canView, projectId, t])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const sortedAssignments = useMemo(
    () => [...assignments].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()),
    [assignments],
  )

  const assigneeOptions = useMemo(
    () => (formState.assigneeType === 'employee'
      ? employees.map((item) => ({ id: item.id, label: `${item.employeeNumber} - ${item.firstName} ${item.lastName}`.trim() }))
      : consultants.map((item) => ({
        id: item.id,
        label: `${item.consultantNumber} - ${item.fullName}${item.isExternal ? ` (${item.tenantCode})` : ''}`.trim(),
      }))),
    [consultants, employees, formState.assigneeType],
  )

  const resetEditor = () => {
    setEditingItem(null)
    setFormState(initialFormState)
    setEditorOpen(false)
  }

  const openCreateDialog = () => {
    setEditingItem(null)
    setFormState(initialFormState)
    setEditorOpen(true)
  }

  const openEditDialog = (item: ProjectAssignmentListItemResponse) => {
    const assigneeType: AssigneeType = item.employeeId ? 'employee' : 'consultant'
    const assigneeId = item.employeeId ?? item.consultantId ?? ''

    setEditingItem(item)
    setFormState({
      assigneeType,
      assigneeId,
      roleTitle: item.roleTitle,
      startDate: item.startDate,
      endDate: item.endDate ?? '',
      isPrimaryAssignment: item.isPrimaryAssignment,
      notes: item.notes ?? '',
      isActive: item.isActive,
    })
    setEditorOpen(true)
  }

  const saveAssignment = async () => {
    if (!formState.assigneeId.trim() || !formState.roleTitle.trim() || !formState.startDate) {
      return
    }

    const payload: CreateProjectAssignmentRequest = {
      employeeId: formState.assigneeType === 'employee' ? formState.assigneeId.trim() : null,
      consultantId: formState.assigneeType === 'consultant' ? formState.assigneeId.trim() : null,
      roleTitle: formState.roleTitle.trim(),
      startDate: formState.startDate,
      endDate: formState.endDate || null,
      isPrimaryAssignment: formState.isPrimaryAssignment,
      notes: formState.notes.trim() || null,
    }

    setIsSaving(true)
    setError(null)
    setFeedback(null)

    try {
      if (editingItem) {
        await updateProjectAssignment(projectId, editingItem.id, {
          ...payload,
          isActive: formState.isActive,
        })
        setFeedback(t('pages.projectDetails.assignmentsPanel.feedback.updated'))
      } else {
        await createProjectAssignment(projectId, payload)
        setFeedback(t('pages.projectDetails.assignmentsPanel.feedback.created'))
      }

      resetEditor()
      await loadData()
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, t('pages.projectDetails.assignmentsPanel.errors.save')))
    } finally {
      setIsSaving(false)
    }
  }

  const removeAssignment = async (assignmentId: string) => {
    setIsSaving(true)
    setError(null)
    setFeedback(null)

    try {
      await deleteProjectAssignment(projectId, assignmentId)
      setFeedback(t('pages.projectDetails.assignmentsPanel.feedback.deleted'))
      await loadData()
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError, t('pages.projectDetails.assignmentsPanel.errors.delete')))
    } finally {
      setIsSaving(false)
    }
  }

  if (!canView) {
    return <VxAlert severity="info">{t('pages.projectDetails.assignmentsPanel.noAccess')}</VxAlert>
  }

  return (
    <VxStack spacing={2}>
      {error ? <VxAlert severity="error" onClose={() => setError(null)}>{error}</VxAlert> : null}
      {feedback ? <VxAlert severity="success" onClose={() => setFeedback(null)}>{feedback}</VxAlert> : null}

      <VxPaper elevation={0} className="panel-card">
        <VxStack spacing={2}>
          <VxStack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <VxTypography variant="h6">{t('pages.projectDetails.assignmentsPanel.title')}</VxTypography>
            {canManage ? (
              <VxButton variant="contained" onClick={openCreateDialog}>
                {t('pages.projectDetails.assignmentsPanel.add')}
              </VxButton>
            ) : null}
          </VxStack>

          {isLoading ? (
            <VxBox sx={{ display: 'grid', placeItems: 'center', py: 4 }}><VxCircularProgress size={24} /></VxBox>
          ) : (
            <VxTableContainer>
              <VxTable size="small">
                <VxTableHead>
                  <VxTableRow>
                    <VxTableCell>{t('pages.projectDetails.assignmentsPanel.columns.assignee')}</VxTableCell>
                    <VxTableCell>{t('pages.projectDetails.assignmentsPanel.columns.type')}</VxTableCell>
                    <VxTableCell>{t('pages.projectDetails.assignmentsPanel.columns.role')}</VxTableCell>
                    <VxTableCell>{t('pages.projectDetails.assignmentsPanel.columns.period')}</VxTableCell>
                    <VxTableCell>{t('pages.projectDetails.assignmentsPanel.columns.primary')}</VxTableCell>
                    <VxTableCell>{t('pages.projectDetails.assignmentsPanel.columns.active')}</VxTableCell>
                    <VxTableCell align="right">{t('common.actions')}</VxTableCell>
                  </VxTableRow>
                </VxTableHead>
                <VxTableBody>
                  {sortedAssignments.map((item) => (
                    <VxTableRow key={item.id}>
                      <VxTableCell>{item.assigneeDisplayName || t('common.labels.none')}</VxTableCell>
                      <VxTableCell>
                        <VxChip
                          size="small"
                          variant="outlined"
                          label={item.assigneeType.toLowerCase() === 'employee'
                            ? t('pages.projectDetails.assignmentsPanel.assigneeType.employee')
                            : t('pages.projectDetails.assignmentsPanel.assigneeType.consultant')}
                        />
                      </VxTableCell>
                      <VxTableCell>{item.roleTitle}</VxTableCell>
                      <VxTableCell>
                        {item.startDate} - {item.endDate || t('common.labels.open')}
                      </VxTableCell>
                      <VxTableCell>{item.isPrimaryAssignment ? t('common.labels.yes') : t('common.labels.no')}</VxTableCell>
                      <VxTableCell>{item.isActive ? t('common.labels.active') : t('common.labels.inactive')}</VxTableCell>
                      <VxTableCell align="right">
                        {canManage ? (
                          <VxStack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                            <VxButton size="small" variant="text" onClick={() => openEditDialog(item)}>{t('common.edit')}</VxButton>
                            <VxButton size="small" color="error" variant="text" onClick={() => void removeAssignment(item.id)} disabled={isSaving}>{t('common.delete')}</VxButton>
                          </VxStack>
                        ) : null}
                      </VxTableCell>
                    </VxTableRow>
                  ))}
                  {sortedAssignments.length === 0 ? (
                    <VxTableRow>
                      <VxTableCell colSpan={7}>
                        <VxTypography color="text.secondary" variant="body2">{t('pages.projectDetails.assignmentsPanel.noItems')}</VxTypography>
                      </VxTableCell>
                    </VxTableRow>
                  ) : null}
                </VxTableBody>
              </VxTable>
            </VxTableContainer>
          )}
        </VxStack>
      </VxPaper>

      <VxPaper elevation={0} className="panel-card">
        <VxStack spacing={1.5}>
          <VxTypography variant="h6">{t('pages.projectDetails.assignmentsPanel.historyTitle')}</VxTypography>
          <VxTableContainer>
            <VxTable size="small">
              <VxTableHead>
                <VxTableRow>
                  <VxTableCell>{t('pages.projectDetails.assignmentsPanel.historyColumns.timestamp')}</VxTableCell>
                  <VxTableCell>{t('pages.projectDetails.assignmentsPanel.historyColumns.event')}</VxTableCell>
                  <VxTableCell>{t('pages.projectDetails.assignmentsPanel.historyColumns.description')}</VxTableCell>
                  <VxTableCell>{t('pages.projectDetails.assignmentsPanel.historyColumns.actor')}</VxTableCell>
                </VxTableRow>
              </VxTableHead>
              <VxTableBody>
                {historyItems.map((item) => (
                  <VxTableRow key={item.auditLogId}>
                    <VxTableCell>{new Date(item.createdAtUtc).toLocaleString()}</VxTableCell>
                    <VxTableCell>{item.eventType}</VxTableCell>
                    <VxTableCell>{item.description || t('common.labels.none')}</VxTableCell>
                    <VxTableCell>{item.actorUserId || t('common.labels.none')}</VxTableCell>
                  </VxTableRow>
                ))}
                {historyItems.length === 0 ? (
                  <VxTableRow>
                    <VxTableCell colSpan={4}>
                      <VxTypography color="text.secondary" variant="body2">{t('pages.projectDetails.assignmentsPanel.noHistory')}</VxTypography>
                    </VxTableCell>
                  </VxTableRow>
                ) : null}
              </VxTableBody>
            </VxTable>
          </VxTableContainer>
        </VxStack>
      </VxPaper>

      <VxDialog open={editorOpen} onClose={isSaving ? undefined : resetEditor} maxWidth="sm" fullWidth>
        <VxDialogTitle>
          {editingItem
            ? t('pages.projectDetails.assignmentsPanel.dialogs.edit')
            : t('pages.projectDetails.assignmentsPanel.dialogs.create')}
        </VxDialogTitle>
        <VxDialogContent dividers>
          <VxStack spacing={2} sx={{ mt: 1 }}>
            <VxTextField
              select
              size="small"
              label={t('pages.projectDetails.assignmentsPanel.fields.assigneeType')}
              value={formState.assigneeType}
              onChange={(event) => setFormState((previous) => ({
                ...previous,
                assigneeType: event.target.value as AssigneeType,
                assigneeId: '',
              }))}
              fullWidth
            >
              <VxMenuItem value="employee">{t('pages.projectDetails.assignmentsPanel.assigneeType.employee')}</VxMenuItem>
              <VxMenuItem value="consultant">{t('pages.projectDetails.assignmentsPanel.assigneeType.consultant')}</VxMenuItem>
            </VxTextField>

            <VxTextField
              select
              size="small"
              label={t('pages.projectDetails.assignmentsPanel.fields.assigneeId')}
              value={formState.assigneeId}
              onChange={(event) => setFormState((previous) => ({ ...previous, assigneeId: event.target.value }))}
              fullWidth
            >
              {assigneeOptions.map((option) => (
                <VxMenuItem key={option.id} value={option.id}>{option.label}</VxMenuItem>
              ))}
            </VxTextField>

            <VxTextField
              size="small"
              label={t('pages.projectDetails.assignmentsPanel.fields.roleTitle')}
              value={formState.roleTitle}
              onChange={(event) => setFormState((previous) => ({ ...previous, roleTitle: event.target.value }))}
              fullWidth
            />

            <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <VxTextField
                size="small"
                type="date"
                label={t('pages.projectDetails.assignmentsPanel.fields.startDate')}
                value={formState.startDate}
                onChange={(event) => setFormState((previous) => ({ ...previous, startDate: event.target.value }))}
                fullWidth
              />
              <VxTextField
                size="small"
                type="date"
                label={t('pages.projectDetails.assignmentsPanel.fields.endDate')}
                value={formState.endDate}
                onChange={(event) => setFormState((previous) => ({ ...previous, endDate: event.target.value }))}
                fullWidth
              />
            </VxStack>

            <VxTextField
              select
              size="small"
              label={t('pages.projectDetails.assignmentsPanel.fields.isPrimaryAssignment')}
              value={formState.isPrimaryAssignment ? 'true' : 'false'}
              onChange={(event) => setFormState((previous) => ({ ...previous, isPrimaryAssignment: event.target.value === 'true' }))}
              fullWidth
            >
              <VxMenuItem value="true">{t('common.labels.yes')}</VxMenuItem>
              <VxMenuItem value="false">{t('common.labels.no')}</VxMenuItem>
            </VxTextField>

            {editingItem ? (
              <VxTextField
                select
                size="small"
                label={t('pages.projectDetails.assignmentsPanel.fields.isActive')}
                value={formState.isActive ? 'true' : 'false'}
                onChange={(event) => setFormState((previous) => ({ ...previous, isActive: event.target.value === 'true' }))}
                fullWidth
              >
                <VxMenuItem value="true">{t('common.labels.active')}</VxMenuItem>
                <VxMenuItem value="false">{t('common.labels.inactive')}</VxMenuItem>
              </VxTextField>
            ) : null}

            <VxTextField
              size="small"
              label={t('pages.projectDetails.assignmentsPanel.fields.notes')}
              value={formState.notes}
              onChange={(event) => setFormState((previous) => ({ ...previous, notes: event.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
          </VxStack>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={resetEditor}>{t('common.cancel')}</VxButton>
          <VxButton
            variant="contained"
            disabled={!formState.assigneeId.trim() || !formState.roleTitle.trim() || !formState.startDate || isSaving}
            onClick={() => void saveAssignment()}
          >
            {editingItem ? t('common.save') : t('common.create')}
          </VxButton>
        </VxDialogActions>
      </VxDialog>
    </VxStack>
  )
}
