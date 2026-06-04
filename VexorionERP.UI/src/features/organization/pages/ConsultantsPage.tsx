import { useCallback, useEffect, useState } from 'react'
import { AddRoundedIcon, Groups2RoundedIcon } from '@vexorion/ui'
import {
  VxAlert,
  VxBox,
  VxButton,
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
  createConsultant,
  deleteConsultant,
  getConsultants,
  updateConsultant,
} from '../../../lib/api'
import type { ConsultantListItemResponse, CreateConsultantRequest } from '../../../types/api'

type ConsultantFormState = {
  consultantNumber: string
  fullName: string
  email: string
  phoneNumber: string
  organizationName: string
  specialty: string
  isActive: boolean
}

const initialFormState: ConsultantFormState = {
  consultantNumber: '',
  fullName: '',
  email: '',
  phoneNumber: '',
  organizationName: '',
  specialty: '',
  isActive: true,
}

export default function ConsultantsPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [rows, setRows] = useState<ConsultantListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formState, setFormState] = useState<ConsultantFormState>(initialFormState)

  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setRows([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setRows(await getConsultants())
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('pages.consultants.errors.load'))
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, t])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const openCreate = () => {
    setEditingId(null)
    setFormState(initialFormState)
    setEditorOpen(true)
  }

  const openEdit = (row: ConsultantListItemResponse) => {
    setEditingId(row.id)
    setFormState({
      consultantNumber: row.consultantNumber,
      fullName: row.fullName,
      email: row.email,
      phoneNumber: row.phoneNumber ?? '',
      organizationName: row.organizationName ?? '',
      specialty: row.specialty ?? '',
      isActive: row.isActive,
    })
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditingId(null)
    setFormState(initialFormState)
  }

  const save = async () => {
    if (!formState.consultantNumber.trim() || !formState.fullName.trim() || !formState.email.trim()) {
      return
    }

    const payload: CreateConsultantRequest = {
      consultantNumber: formState.consultantNumber.trim(),
      fullName: formState.fullName.trim(),
      email: formState.email.trim(),
      phoneNumber: formState.phoneNumber.trim() || null,
      organizationName: formState.organizationName.trim() || null,
      specialty: formState.specialty.trim() || null,
    }

    setIsSaving(true)
    setError(null)
    setFeedback(null)

    try {
      if (editingId) {
        await updateConsultant(editingId, { ...payload, isActive: formState.isActive })
        setFeedback(t('pages.consultants.feedback.updated'))
      } else {
        await createConsultant(payload)
        setFeedback(t('pages.consultants.feedback.created'))
      }

      closeEditor()
      await loadData()
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : t('pages.consultants.errors.save'))
    } finally {
      setIsSaving(false)
    }
  }

  const remove = async (consultantId: string) => {
    setIsSaving(true)
    setError(null)
    setFeedback(null)

    try {
      await deleteConsultant(consultantId)
      setFeedback(t('pages.consultants.feedback.deleted'))
      await loadData()
    } catch (deleteError) {
      setError(deleteError instanceof ApiError ? deleteError.message : t('pages.consultants.errors.delete'))
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAuthenticated) {
    return <VxAlert severity="info">{t('pages.consultants.signInRequired')}</VxAlert>
  }

  return (
    <VxStack spacing={3}>
      <VxPaper elevation={0} className="panel-card">
        <VxStack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ justifyContent: 'space-between' }}>
          <VxBox>
            <VxTypography variant="h4" sx={{ mb: 1 }}>{t('nav.routeTitles.consultants')}</VxTypography>
            <VxTypography color="text.secondary">{t('pages.consultants.description')}</VxTypography>
          </VxBox>
          <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
            <VxButton variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}>{t('pages.consultants.newButton')}</VxButton>
            <VxPaper elevation={0} className="products-metric-card">
              <Groups2RoundedIcon fontSize="small" />
              <VxBox>
                <VxTypography variant="body2" color="text.secondary">{t('pages.consultants.metrics.rows')}</VxTypography>
                <VxTypography variant="h6">{rows.length}</VxTypography>
              </VxBox>
            </VxPaper>
          </VxStack>
        </VxStack>
      </VxPaper>

      {error ? <VxAlert severity="error">{error}</VxAlert> : null}
      {feedback ? <VxAlert severity="success">{feedback}</VxAlert> : null}

      <VxPaper elevation={0} className="panel-card">
        {isLoading ? (
          <VxBox sx={{ display: 'grid', placeItems: 'center', py: 4 }}><VxCircularProgress size={24} /></VxBox>
        ) : (
          <VxTableContainer>
            <VxTable size="small">
              <VxTableHead>
                <VxTableRow>
                  <VxTableCell>{t('pages.consultants.columns.number')}</VxTableCell>
                  <VxTableCell>{t('pages.consultants.columns.fullName')}</VxTableCell>
                  <VxTableCell>{t('pages.consultants.columns.email')}</VxTableCell>
                  <VxTableCell>{t('pages.consultants.columns.organization')}</VxTableCell>
                  <VxTableCell>{t('pages.consultants.columns.specialty')}</VxTableCell>
                  <VxTableCell>{t('pages.consultants.columns.active')}</VxTableCell>
                  <VxTableCell align="right">{t('common.actions')}</VxTableCell>
                </VxTableRow>
              </VxTableHead>
              <VxTableBody>
                {rows.map((row) => (
                  <VxTableRow key={row.id}>
                    <VxTableCell>{row.consultantNumber}</VxTableCell>
                    <VxTableCell>{row.fullName}</VxTableCell>
                    <VxTableCell>{row.email}</VxTableCell>
                    <VxTableCell>{row.organizationName || t('common.labels.none')}</VxTableCell>
                    <VxTableCell>{row.specialty || t('common.labels.none')}</VxTableCell>
                    <VxTableCell>{row.isActive ? t('common.labels.active') : t('common.labels.inactive')}</VxTableCell>
                    <VxTableCell align="right">
                      <VxStack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                        <VxButton size="small" variant="text" onClick={() => openEdit(row)}>{t('common.edit')}</VxButton>
                        <VxButton size="small" color="error" variant="text" onClick={() => void remove(row.id)} disabled={isSaving}>{t('common.delete')}</VxButton>
                      </VxStack>
                    </VxTableCell>
                  </VxTableRow>
                ))}
                {rows.length === 0 ? (
                  <VxTableRow>
                    <VxTableCell colSpan={7}>
                      <VxTypography color="text.secondary" variant="body2">{t('pages.consultants.noRows')}</VxTypography>
                    </VxTableCell>
                  </VxTableRow>
                ) : null}
              </VxTableBody>
            </VxTable>
          </VxTableContainer>
        )}
      </VxPaper>

      <VxDialog open={editorOpen} onClose={isSaving ? undefined : closeEditor} maxWidth="md" fullWidth>
        <VxDialogTitle>{editingId ? t('pages.consultants.dialogs.edit') : t('pages.consultants.dialogs.create')}</VxDialogTitle>
        <VxDialogContent dividers>
          <VxStack spacing={2} sx={{ mt: 1 }}>
            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <VxTextField size="small" label={t('pages.consultants.fields.consultantNumber')} value={formState.consultantNumber} onChange={(event) => setFormState((prev) => ({ ...prev, consultantNumber: event.target.value }))} fullWidth />
              <VxTextField size="small" label={t('pages.consultants.fields.fullName')} value={formState.fullName} onChange={(event) => setFormState((prev) => ({ ...prev, fullName: event.target.value }))} fullWidth />
            </VxStack>
            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <VxTextField size="small" label={t('pages.consultants.fields.email')} value={formState.email} onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))} fullWidth />
              <VxTextField size="small" label={t('pages.consultants.fields.phoneNumber')} value={formState.phoneNumber} onChange={(event) => setFormState((prev) => ({ ...prev, phoneNumber: event.target.value }))} fullWidth />
            </VxStack>
            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <VxTextField size="small" label={t('pages.consultants.fields.organizationName')} value={formState.organizationName} onChange={(event) => setFormState((prev) => ({ ...prev, organizationName: event.target.value }))} fullWidth />
              <VxTextField size="small" label={t('pages.consultants.fields.specialty')} value={formState.specialty} onChange={(event) => setFormState((prev) => ({ ...prev, specialty: event.target.value }))} fullWidth />
            </VxStack>
            {editingId ? (
              <VxTextField select size="small" label={t('pages.consultants.fields.isActive')} value={formState.isActive ? 'true' : 'false'} onChange={(event) => setFormState((prev) => ({ ...prev, isActive: event.target.value === 'true' }))} fullWidth>
                <VxMenuItem value="true">{t('common.labels.active')}</VxMenuItem>
                <VxMenuItem value="false">{t('common.labels.inactive')}</VxMenuItem>
              </VxTextField>
            ) : null}
          </VxStack>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={closeEditor}>{t('common.cancel')}</VxButton>
          <VxButton variant="contained" disabled={isSaving || !formState.consultantNumber.trim() || !formState.fullName.trim() || !formState.email.trim()} onClick={() => void save()}>{editingId ? t('common.save') : t('common.create')}</VxButton>
        </VxDialogActions>
      </VxDialog>
    </VxStack>
  )
}
