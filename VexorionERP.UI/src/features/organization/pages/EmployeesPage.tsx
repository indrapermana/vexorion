import { useCallback, useEffect, useMemo, useState } from 'react'
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
  createEmployee,
  deleteEmployee,
  getCompanies,
  getEmployees,
  updateEmployee,
} from '../../../lib/api'
import type {
  CompanyListItemResponse,
  CreateEmployeeRequest,
  EmployeeListItemResponse,
} from '../../../types/api'

type EmployeeFormState = {
  companyId: string
  departmentId: string
  employeeNumber: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  jobTitle: string
  hireDate: string
  isActive: boolean
}

const initialFormState: EmployeeFormState = {
  companyId: '',
  departmentId: '',
  employeeNumber: '',
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  jobTitle: '',
  hireDate: '',
  isActive: true,
}

export default function EmployeesPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [rows, setRows] = useState<EmployeeListItemResponse[]>([])
  const [companies, setCompanies] = useState<CompanyListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formState, setFormState] = useState<EmployeeFormState>(initialFormState)

  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setRows([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [employeeResult, companyResult] = await Promise.all([
        getEmployees(),
        getCompanies(),
      ])
      setRows(employeeResult)
      setCompanies(companyResult)
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('pages.employees.errors.load'))
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, t])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const companyNameById = useMemo(
    () => new Map(companies.map((item) => [item.id, `${item.code} - ${item.name}`])),
    [companies],
  )

  const openCreate = () => {
    setEditingId(null)
    setFormState(initialFormState)
    setEditorOpen(true)
  }

  const openEdit = (row: EmployeeListItemResponse) => {
    setEditingId(row.id)
    setFormState({
      companyId: row.companyId,
      departmentId: row.departmentId ?? '',
      employeeNumber: row.employeeNumber,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phoneNumber: '',
      jobTitle: row.jobTitle,
      hireDate: '',
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
    if (!formState.companyId || !formState.employeeNumber.trim() || !formState.firstName.trim() || !formState.lastName.trim() || !formState.email.trim() || !formState.jobTitle.trim() || !formState.hireDate) {
      return
    }

    const payload: CreateEmployeeRequest = {
      companyId: formState.companyId,
      departmentId: formState.departmentId.trim() || null,
      employeeNumber: formState.employeeNumber.trim(),
      firstName: formState.firstName.trim(),
      lastName: formState.lastName.trim(),
      email: formState.email.trim(),
      phoneNumber: formState.phoneNumber.trim() || null,
      jobTitle: formState.jobTitle.trim(),
      hireDate: formState.hireDate,
    }

    setIsSaving(true)
    setError(null)
    setFeedback(null)

    try {
      if (editingId) {
        await updateEmployee(editingId, { ...payload, isActive: formState.isActive })
        setFeedback(t('pages.employees.feedback.updated'))
      } else {
        await createEmployee(payload)
        setFeedback(t('pages.employees.feedback.created'))
      }

      closeEditor()
      await loadData()
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : t('pages.employees.errors.save'))
    } finally {
      setIsSaving(false)
    }
  }

  const remove = async (employeeId: string) => {
    setIsSaving(true)
    setError(null)
    setFeedback(null)

    try {
      await deleteEmployee(employeeId)
      setFeedback(t('pages.employees.feedback.deleted'))
      await loadData()
    } catch (deleteError) {
      setError(deleteError instanceof ApiError ? deleteError.message : t('pages.employees.errors.delete'))
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAuthenticated) {
    return <VxAlert severity="info">{t('pages.employees.signInRequired')}</VxAlert>
  }

  return (
    <VxStack spacing={3}>
      <VxPaper elevation={0} className="panel-card">
        <VxStack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ justifyContent: 'space-between' }}>
          <VxBox>
            <VxTypography variant="h4" sx={{ mb: 1 }}>{t('nav.routeTitles.employees')}</VxTypography>
            <VxTypography color="text.secondary">{t('pages.employees.description')}</VxTypography>
          </VxBox>
          <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
            <VxButton variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}>{t('pages.employees.newButton')}</VxButton>
            <VxPaper elevation={0} className="products-metric-card">
              <Groups2RoundedIcon fontSize="small" />
              <VxBox>
                <VxTypography variant="body2" color="text.secondary">{t('pages.employees.metrics.rows')}</VxTypography>
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
                  <VxTableCell>{t('pages.employees.columns.number')}</VxTableCell>
                  <VxTableCell>{t('pages.employees.columns.name')}</VxTableCell>
                  <VxTableCell>{t('pages.employees.columns.email')}</VxTableCell>
                  <VxTableCell>{t('pages.employees.columns.jobTitle')}</VxTableCell>
                  <VxTableCell>{t('pages.employees.columns.company')}</VxTableCell>
                  <VxTableCell>{t('pages.employees.columns.active')}</VxTableCell>
                  <VxTableCell align="right">{t('common.actions')}</VxTableCell>
                </VxTableRow>
              </VxTableHead>
              <VxTableBody>
                {rows.map((row) => (
                  <VxTableRow key={row.id}>
                    <VxTableCell>{row.employeeNumber}</VxTableCell>
                    <VxTableCell>{`${row.firstName} ${row.lastName}`.trim()}</VxTableCell>
                    <VxTableCell>{row.email}</VxTableCell>
                    <VxTableCell>{row.jobTitle}</VxTableCell>
                    <VxTableCell>{companyNameById.get(row.companyId) || row.companyId}</VxTableCell>
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
                      <VxTypography color="text.secondary" variant="body2">{t('pages.employees.noRows')}</VxTypography>
                    </VxTableCell>
                  </VxTableRow>
                ) : null}
              </VxTableBody>
            </VxTable>
          </VxTableContainer>
        )}
      </VxPaper>

      <VxDialog open={editorOpen} onClose={isSaving ? undefined : closeEditor} maxWidth="md" fullWidth>
        <VxDialogTitle>{editingId ? t('pages.employees.dialogs.edit') : t('pages.employees.dialogs.create')}</VxDialogTitle>
        <VxDialogContent dividers>
          <VxStack spacing={2} sx={{ mt: 1 }}>
            <VxTextField select size="small" label={t('pages.employees.fields.company')} value={formState.companyId} onChange={(event) => setFormState((prev) => ({ ...prev, companyId: event.target.value }))} fullWidth>
              {companies.map((company) => (
                <VxMenuItem key={company.id} value={company.id}>{`${company.code} - ${company.name}`}</VxMenuItem>
              ))}
            </VxTextField>
            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <VxTextField size="small" label={t('pages.employees.fields.employeeNumber')} value={formState.employeeNumber} onChange={(event) => setFormState((prev) => ({ ...prev, employeeNumber: event.target.value }))} fullWidth />
              <VxTextField size="small" label={t('pages.employees.fields.departmentId')} value={formState.departmentId} onChange={(event) => setFormState((prev) => ({ ...prev, departmentId: event.target.value }))} fullWidth />
            </VxStack>
            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <VxTextField size="small" label={t('pages.employees.fields.firstName')} value={formState.firstName} onChange={(event) => setFormState((prev) => ({ ...prev, firstName: event.target.value }))} fullWidth />
              <VxTextField size="small" label={t('pages.employees.fields.lastName')} value={formState.lastName} onChange={(event) => setFormState((prev) => ({ ...prev, lastName: event.target.value }))} fullWidth />
            </VxStack>
            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <VxTextField size="small" label={t('pages.employees.fields.email')} value={formState.email} onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))} fullWidth />
              <VxTextField size="small" label={t('pages.employees.fields.phoneNumber')} value={formState.phoneNumber} onChange={(event) => setFormState((prev) => ({ ...prev, phoneNumber: event.target.value }))} fullWidth />
            </VxStack>
            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <VxTextField size="small" label={t('pages.employees.fields.jobTitle')} value={formState.jobTitle} onChange={(event) => setFormState((prev) => ({ ...prev, jobTitle: event.target.value }))} fullWidth />
              <VxTextField size="small" type="date" label={t('pages.employees.fields.hireDate')} value={formState.hireDate} onChange={(event) => setFormState((prev) => ({ ...prev, hireDate: event.target.value }))} fullWidth />
            </VxStack>
            {editingId ? (
              <VxTextField select size="small" label={t('pages.employees.fields.isActive')} value={formState.isActive ? 'true' : 'false'} onChange={(event) => setFormState((prev) => ({ ...prev, isActive: event.target.value === 'true' }))} fullWidth>
                <VxMenuItem value="true">{t('common.labels.active')}</VxMenuItem>
                <VxMenuItem value="false">{t('common.labels.inactive')}</VxMenuItem>
              </VxTextField>
            ) : null}
          </VxStack>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={closeEditor}>{t('common.cancel')}</VxButton>
          <VxButton variant="contained" disabled={isSaving || !formState.companyId || !formState.employeeNumber.trim() || !formState.firstName.trim() || !formState.lastName.trim() || !formState.email.trim() || !formState.jobTitle.trim() || !formState.hireDate} onClick={() => void save()}>{editingId ? t('common.save') : t('common.create')}</VxButton>
        </VxDialogActions>
      </VxDialog>
    </VxStack>
  )
}
