import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AddRoundedIcon,
  Groups2RoundedIcon,
  VxAlert,
  VxAutocomplete,
  VxButton,
  VxChip,
  VxCheckbox,
  VxConfirmActionButton,
  VxDialog,
  VxDialogActions,
  VxDialogContent,
  VxDialogTitle,
  VxFormControlLabel,
  VxMenuItem,
  VxStack,
  VxSwitch,
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
import { Permissions } from '../../../app/authorization'
import PermissionReadOnlyAlert from '../../../components/PermissionReadOnlyAlert'
import { PageBody, PageFeedback, PageHeader, PageLoadingState, PageMetric } from '../../../components/PagePrimitives'
import { useUnsavedChangesPrompt } from '../../../hooks/useUnsavedChangesPrompt'
import { readRelationshipScope, restrictedRelationshipScope, updateRelationshipScope, type RelationshipScope } from '../relationshipScope'
import {
  activateTenantRelationship,
  ApiError,
  createTenantRelationship,
  deleteTenantRelationship,
  getActiveTenantRelationships,
  getTenantRelationships,
  getTenants,
  updateTenantRelationship,
} from '../../../lib/api'
import type {
  ActivateTenantRelationshipRequest,
  CreateTenantRelationshipRequest,
  TenantRelationshipListItemResponse,
  TenantRelationshipStatusValue,
  TenantRelationshipTypeValue,
  TenantLookupResponse,
  UpdateTenantRelationshipRequest,
} from '../../../types/api'

type RelationshipFormState = {
  relatedTenantId: string
  relationshipType: TenantRelationshipTypeValue
  status: TenantRelationshipStatusValue
  effectiveFrom: string
  effectiveTo: string
  contractReference: string
  scopeJson: string
}

type ActivationFormState = {
  effectiveFrom: string
  effectiveTo: string
  scopeJson: string
}

const defaultFormState: RelationshipFormState = {
  relatedTenantId: '',
  relationshipType: 1,
  status: 1,
  effectiveFrom: '',
  effectiveTo: '',
  contractReference: '',
  scopeJson: restrictedRelationshipScope,
}

const defaultActivationState: ActivationFormState = {
  effectiveFrom: '',
  effectiveTo: '',
  scopeJson: restrictedRelationshipScope,
}

const relationshipTypes: TenantRelationshipTypeValue[] = [1, 2, 3, 4, 5, 6, 7]
const relationshipStatuses: TenantRelationshipStatusValue[] = [1, 2, 3, 4, 5]

function extractApiError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.validation) {
      const firstMessage = Object.values(error.validation)
        .find((messages) => Array.isArray(messages) && messages.length > 0)?.[0]
      if (firstMessage) {
        return firstMessage
      }
    }

    return error.message
  }

  return fallback
}

function normalizeNullable(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseScopeJson(value: string, invalidMessage: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return { value: null as string | null, error: null as string | null }
  }

  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return { value: null as string | null, error: invalidMessage }
    return { value: trimmed, error: null as string | null }
  } catch {
    return { value: null as string | null, error: invalidMessage }
  }
}

function RelationshipScopeFields({ value, onChange, disabled }: { value: string, onChange: (value: string) => void, disabled: boolean }) {
  const { t } = useTranslation()
  const scope = readRelationshipScope(value)
  const keys: Array<keyof RelationshipScope> = ['canViewDocuments', 'canUploadDocuments', 'canAssignPeople']
  return (
    <VxStack spacing={0.5}>
      {keys.map((key) => (
        <VxFormControlLabel
          key={key}
          label={t(`pages.projectDetails.parties.fields.${key}`)}
          control={<VxCheckbox checked={scope[key]} disabled={disabled} onChange={(_, checked) => onChange(updateRelationshipScope(value, key, checked))} />}
        />
      ))}
    </VxStack>
  )
}

export default function TenantRelationshipsPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()

  const canView = user?.permissions.includes(Permissions.tenants.view) ?? false
  const canManage = user?.permissions.includes(Permissions.tenants.manage) ?? false

  const [rows, setRows] = useState<TenantRelationshipListItemResponse[]>([])
  const [tenants, setTenants] = useState<TenantLookupResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showActiveOnly, setShowActiveOnly] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TenantRelationshipListItemResponse | null>(null)
  const [formState, setFormState] = useState<RelationshipFormState>(defaultFormState)
  const [initialForm, setInitialForm] = useState<RelationshipFormState>(defaultFormState)

  const [activationOpen, setActivationOpen] = useState(false)
  const [activationItem, setActivationItem] = useState<TenantRelationshipListItemResponse | null>(null)
  const [activationState, setActivationState] = useState<ActivationFormState>(defaultActivationState)
  const [initialActivationState, setInitialActivationState] = useState<ActivationFormState>(defaultActivationState)
  const { requestClose: requestEditorClose, confirmationDialog: editorDiscardDialog } = useUnsavedChangesPrompt(
    canManage && editorOpen && JSON.stringify(formState) !== JSON.stringify(initialForm),
    isSaving,
    () => {
      setEditorOpen(false)
      setEditingItem(null)
      setFormState(defaultFormState)
    },
    () => setFormState(initialForm),
  )
  const { requestClose: requestActivationClose, confirmationDialog: activationDiscardDialog } = useUnsavedChangesPrompt(
    canManage && activationOpen && JSON.stringify(activationState) !== JSON.stringify(initialActivationState),
    isSaving,
    () => {
      setActivationOpen(false)
      setActivationItem(null)
      setActivationState(defaultActivationState)
    },
    () => setActivationState(initialActivationState),
  )

  const statusLabelMap = useMemo(() => ({
    1: t('pages.tenantRelationships.status.pending'),
    2: t('pages.tenantRelationships.status.active'),
    3: t('pages.tenantRelationships.status.suspended'),
    4: t('pages.tenantRelationships.status.ended'),
    5: t('pages.tenantRelationships.status.rejected'),
  }), [t])

  const relationshipTypeLabelMap = useMemo(() => ({
    1: t('pages.tenantRelationships.relationshipType.primeContractor'),
    2: t('pages.tenantRelationships.relationshipType.subcontractor'),
    3: t('pages.tenantRelationships.relationshipType.legalSponsor'),
    4: t('pages.tenantRelationships.relationshipType.deliveryPartner'),
    5: t('pages.tenantRelationships.relationshipType.customer'),
    6: t('pages.tenantRelationships.relationshipType.vendor'),
    7: t('pages.tenantRelationships.relationshipType.consortiumMember'),
  }), [t])

  const tenantOptions = tenants.filter((tenant) => tenant.id !== user?.tenantId)
  const tenantLabel = (tenantId: string) => {
    const tenant = tenants.find((item) => item.id === tenantId)
    return tenant ? `${tenant.code} - ${tenant.name}` : t('pages.tenantRelationships.unavailableTenant')
  }

  const loadData = useCallback(async () => {
    if (!isAuthenticated || !canView) {
      setRows([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [result, tenantResult] = await Promise.all([
        showActiveOnly ? getActiveTenantRelationships() : getTenantRelationships(),
        getTenants(),
      ])
      setRows(result)
      setTenants(tenantResult)
    } catch (loadError) {
      setError(extractApiError(loadError, t('pages.tenantRelationships.errors.load')))
    } finally {
      setIsLoading(false)
    }
  }, [canView, isAuthenticated, showActiveOnly, t])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const openCreateDialog = () => {
    if (!canManage) return
    setEditingItem(null)
    setFormState(defaultFormState)
    setInitialForm(defaultFormState)
    setEditorOpen(true)
  }

  const openEditDialog = (item: TenantRelationshipListItemResponse) => {
    if (!canManage) return
    setEditingItem(item)
    const nextForm: RelationshipFormState = {
      relatedTenantId: item.relatedTenantId,
      relationshipType: item.relationshipType,
      status: item.status,
      effectiveFrom: item.effectiveFrom ?? '',
      effectiveTo: item.effectiveTo ?? '',
      contractReference: item.contractReference ?? '',
      scopeJson: item.scopeJson ?? '',
    }
    setFormState(nextForm)
    setInitialForm(nextForm)
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditingItem(null)
    setFormState(defaultFormState)
  }

  const openActivateDialog = (item: TenantRelationshipListItemResponse) => {
    if (!canManage) return
    setActivationItem(item)
    setActivationState({
      effectiveFrom: item.effectiveFrom ?? '',
      effectiveTo: item.effectiveTo ?? '',
      scopeJson: item.scopeJson ?? '',
    })
    setInitialActivationState({
      effectiveFrom: item.effectiveFrom ?? '',
      effectiveTo: item.effectiveTo ?? '',
      scopeJson: item.scopeJson ?? '',
    })
    setActivationOpen(true)
  }

  const closeActivateDialog = () => {
    setActivationOpen(false)
    setActivationItem(null)
    setActivationState(defaultActivationState)
    setInitialActivationState(defaultActivationState)
  }

  const saveRelationship = async () => {
    if (!canManage) return
    if (!tenantOptions.some((tenant) => tenant.id === formState.relatedTenantId && tenant.isActive)) {
      return
    }

    const scope = parseScopeJson(formState.scopeJson, t('pages.tenantRelationships.scopeInvalid'))
    if (scope.error) {
      setError(scope.error)
      return
    }

    setIsSaving(true)
    setError(null)
    setFeedback(null)

    try {
      if (editingItem) {
        const request: UpdateTenantRelationshipRequest = {
          relatedTenantId: formState.relatedTenantId.trim(),
          relationshipType: formState.relationshipType,
          status: formState.status,
          effectiveFrom: normalizeNullable(formState.effectiveFrom),
          effectiveTo: normalizeNullable(formState.effectiveTo),
          contractReference: normalizeNullable(formState.contractReference),
          scopeJson: scope.value,
        }
        await updateTenantRelationship(editingItem.id, request)
        setFeedback(t('pages.tenantRelationships.feedback.updated'))
      } else {
        const request: CreateTenantRelationshipRequest = {
          relatedTenantId: formState.relatedTenantId.trim(),
          relationshipType: formState.relationshipType,
          effectiveFrom: normalizeNullable(formState.effectiveFrom),
          effectiveTo: normalizeNullable(formState.effectiveTo),
          contractReference: normalizeNullable(formState.contractReference),
          scopeJson: scope.value,
        }
        await createTenantRelationship(request)
        setFeedback(t('pages.tenantRelationships.feedback.created'))
      }

      closeEditor()
      await loadData()
    } catch (saveError) {
      setError(extractApiError(saveError, t('pages.tenantRelationships.errors.save')))
    } finally {
      setIsSaving(false)
    }
  }

  const activateRelationship = async () => {
    if (!canManage) return
    if (!activationItem) {
      return
    }

    const scope = parseScopeJson(activationState.scopeJson, t('pages.tenantRelationships.scopeInvalid'))
    if (scope.error) {
      setError(scope.error)
      return
    }

    setIsSaving(true)
    setError(null)
    setFeedback(null)

    try {
      const request: ActivateTenantRelationshipRequest = {
        effectiveFrom: normalizeNullable(activationState.effectiveFrom),
        effectiveTo: normalizeNullable(activationState.effectiveTo),
        scopeJson: scope.value,
      }
      await activateTenantRelationship(activationItem.id, request)
      setFeedback(t('pages.tenantRelationships.feedback.activated'))
      closeActivateDialog()
      await loadData()
    } catch (activateError) {
      setError(extractApiError(activateError, t('pages.tenantRelationships.errors.activate')))
    } finally {
      setIsSaving(false)
    }
  }

  const removeRelationship = async (relationshipId: string) => {
    if (!canManage) return
    setIsSaving(true)
    setError(null)
    setFeedback(null)

    try {
      await deleteTenantRelationship(relationshipId)
      setFeedback(t('pages.tenantRelationships.feedback.deleted'))
      await loadData()
    } catch (deleteError) {
      setError(extractApiError(deleteError, t('pages.tenantRelationships.errors.delete')))
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAuthenticated) {
    return <VxAlert severity="info">{t('pages.tenantRelationships.signInRequired')}</VxAlert>
  }

  if (!canView) {
    return <VxAlert severity="info">{t('pages.tenantRelationships.noAccess')}</VxAlert>
  }

  return (
    <VxStack spacing={3}>
      <PageHeader
        title={t('nav.routeTitles.tenantRelationships')}
        description={t('pages.tenantRelationships.description')}
        primaryAction={canManage ? (
          <VxButton variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreateDialog}>
            {t('pages.tenantRelationships.newButton')}
          </VxButton>
        ) : null}
        filters={(
            <VxStack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <VxTypography variant="body2">{t('pages.tenantRelationships.activeOnly')}</VxTypography>
              <VxSwitch checked={showActiveOnly} slotProps={{ input: { 'aria-label': t('pages.tenantRelationships.activeOnly') } }} onChange={(event) => setShowActiveOnly(event.target.checked)} />
            </VxStack>
        )}
        metrics={<PageMetric icon={<Groups2RoundedIcon fontSize="small" />} label={t('pages.tenantRelationships.metrics.rows')} value={rows.length} />}
      />

      <PageFeedback error={error} success={feedback} onRetry={error ? () => void loadData() : undefined} />
      <VxAlert severity="info">{t('pages.tenantRelationships.boundary')}</VxAlert>
      {!canManage ? <PermissionReadOnlyAlert requiredPermission={Permissions.tenants.manage} /> : null}

      <PageBody>
        {isLoading ? (
          <PageLoadingState label={t('common.labels.loading')} />
        ) : (
          <VxTableContainer>
            <VxTable size="small">
              <VxTableHead>
                <VxTableRow>
                  <VxTableCell>{t('pages.tenantRelationships.fields.relatedTenant')}</VxTableCell>
                  <VxTableCell>{t('pages.tenantRelationships.columns.relationshipType')}</VxTableCell>
                  <VxTableCell>{t('pages.tenantRelationships.columns.status')}</VxTableCell>
                  <VxTableCell>{t('pages.tenantRelationships.columns.effective')}</VxTableCell>
                  <VxTableCell>{t('pages.tenantRelationships.columns.contractReference')}</VxTableCell>
                  <VxTableCell>{t('pages.tenantRelationships.columns.updatedAt')}</VxTableCell>
                  <VxTableCell align="right">{t('common.actions')}</VxTableCell>
                </VxTableRow>
              </VxTableHead>
              <VxTableBody>
                {rows.map((row) => (
                  <VxTableRow key={row.id}>
                    <VxTableCell>{tenantLabel(row.relatedTenantId)}</VxTableCell>
                    <VxTableCell>{relationshipTypeLabelMap[row.relationshipType]}</VxTableCell>
                    <VxTableCell>
                      <VxChip size="small" variant="outlined" label={statusLabelMap[row.status]} />
                    </VxTableCell>
                    <VxTableCell>{`${row.effectiveFrom ?? t('common.labels.open')} - ${row.effectiveTo ?? t('common.labels.open')}`}</VxTableCell>
                    <VxTableCell>{row.contractReference || t('common.labels.none')}</VxTableCell>
                    <VxTableCell>{new Date(row.updatedAtUtc).toLocaleString()}</VxTableCell>
                    <VxTableCell align="right">
                      {canManage ? (
                        <VxStack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                          <VxButton size="small" variant="text" onClick={() => openEditDialog(row)}>{t('common.edit')}</VxButton>
                          {row.status !== 2 ? (
                            <VxButton size="small" variant="text" onClick={() => openActivateDialog(row)}>{t('pages.tenantRelationships.activateButton')}</VxButton>
                          ) : null}
                          <VxConfirmActionButton
                            title={t('common.delete')}
                            targetName={`${tenantLabel(row.relatedTenantId)} - ${relationshipTypeLabelMap[row.relationshipType]}`}
                            consequence={t('pages.deleteConfirmations.tenantRelationship.consequence')}
                            confirmLabel={t('common.delete')}
                            pendingLabel={t('dialogs.deleting')}
                            onConfirm={() => removeRelationship(row.id)}
                            buttonProps={{ size: 'small', color: 'error', variant: 'text', disabled: isSaving }}
                          >{t('common.delete')}</VxConfirmActionButton>
                        </VxStack>
                      ) : null}
                    </VxTableCell>
                  </VxTableRow>
                ))}
                {rows.length === 0 ? (
                  <VxTableRow>
                    <VxTableCell colSpan={7}>
                      <VxTypography color="text.secondary" variant="body2">{t('pages.tenantRelationships.noRows')}</VxTypography>
                    </VxTableCell>
                  </VxTableRow>
                ) : null}
              </VxTableBody>
            </VxTable>
          </VxTableContainer>
        )}
      </PageBody>

      <VxDialog open={canManage && editorOpen} onClose={requestEditorClose} maxWidth="md" fullWidth>
        <VxDialogTitle>{editingItem ? t('pages.tenantRelationships.dialogs.edit') : t('pages.tenantRelationships.dialogs.create')}</VxDialogTitle>
        <VxDialogContent dividers>
          <VxStack spacing={2} sx={{ mt: 1 }}>
            <VxAutocomplete
              options={tenantOptions}
              noOptionsText={t('pages.tenantRelationships.noEligibleTenants')}
              value={tenantOptions.find((tenant) => tenant.id === formState.relatedTenantId) ?? null}
              getOptionLabel={(tenant) => `${tenant.code} - ${tenant.name}`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionDisabled={(tenant) => !tenant.isActive}
              disabled={isSaving}
              onChange={(_, tenant) => setFormState((previous) => ({ ...previous, relatedTenantId: tenant?.id ?? '' }))}
              renderInput={(params) => <VxTextField {...params} size="small" label={t('pages.tenantRelationships.fields.relatedTenant')} />}
            />
            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <VxTextField
                select
                size="small"
                label={t('pages.tenantRelationships.fields.relationshipType')}
                value={formState.relationshipType}
                onChange={(event) => setFormState((previous) => ({ ...previous, relationshipType: Number(event.target.value) as TenantRelationshipTypeValue }))}
                fullWidth
              >
                {relationshipTypes.map((value) => (
                  <VxMenuItem key={value} value={value}>{relationshipTypeLabelMap[value]}</VxMenuItem>
                ))}
              </VxTextField>
              {editingItem ? (
                <VxTextField
                  select
                  size="small"
                  label={t('pages.tenantRelationships.fields.status')}
                  value={formState.status}
                  onChange={(event) => setFormState((previous) => ({ ...previous, status: Number(event.target.value) as TenantRelationshipStatusValue }))}
                  fullWidth
                >
                  {relationshipStatuses.map((value) => (
                    <VxMenuItem key={value} value={value}>{statusLabelMap[value]}</VxMenuItem>
                  ))}
                </VxTextField>
              ) : null}
            </VxStack>
            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <VxTextField
                size="small"
                type="date"
                label={t('pages.tenantRelationships.fields.effectiveFrom')}
                value={formState.effectiveFrom}
                onChange={(event) => setFormState((previous) => ({ ...previous, effectiveFrom: event.target.value }))}
                fullWidth
              />
              <VxTextField
                size="small"
                type="date"
                label={t('pages.tenantRelationships.fields.effectiveTo')}
                value={formState.effectiveTo}
                onChange={(event) => setFormState((previous) => ({ ...previous, effectiveTo: event.target.value }))}
                fullWidth
              />
            </VxStack>
            <VxTextField
              size="small"
              label={t('pages.tenantRelationships.fields.contractReference')}
              value={formState.contractReference}
              onChange={(event) => setFormState((previous) => ({ ...previous, contractReference: event.target.value }))}
              fullWidth
            />
            <RelationshipScopeFields value={formState.scopeJson} disabled={isSaving} onChange={(scopeJson) => setFormState((previous) => ({ ...previous, scopeJson }))} />
          </VxStack>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={requestEditorClose} disabled={isSaving}>{t('common.cancel')}</VxButton>
          <VxButton
            variant="contained"
            disabled={isSaving || !tenantOptions.some((tenant) => tenant.id === formState.relatedTenantId && tenant.isActive)}
            onClick={() => void saveRelationship()}
          >
            {editingItem ? t('common.save') : t('common.create')}
          </VxButton>
        </VxDialogActions>
      </VxDialog>
      {editorDiscardDialog}

      <VxDialog open={canManage && activationOpen} onClose={requestActivationClose} maxWidth="md" fullWidth>
        <VxDialogTitle>{t('pages.tenantRelationships.dialogs.activate')}</VxDialogTitle>
        <VxDialogContent dividers>
          <VxStack spacing={2} sx={{ mt: 1 }}>
            <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <VxTextField
                size="small"
                type="date"
                label={t('pages.tenantRelationships.fields.effectiveFrom')}
                value={activationState.effectiveFrom}
                onChange={(event) => setActivationState((previous) => ({ ...previous, effectiveFrom: event.target.value }))}
                fullWidth
              />
              <VxTextField
                size="small"
                type="date"
                label={t('pages.tenantRelationships.fields.effectiveTo')}
                value={activationState.effectiveTo}
                onChange={(event) => setActivationState((previous) => ({ ...previous, effectiveTo: event.target.value }))}
                fullWidth
              />
            </VxStack>
            <RelationshipScopeFields value={activationState.scopeJson} disabled={isSaving} onChange={(scopeJson) => setActivationState((previous) => ({ ...previous, scopeJson }))} />
          </VxStack>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={requestActivationClose} disabled={isSaving}>{t('common.cancel')}</VxButton>
          <VxButton variant="contained" disabled={isSaving} onClick={() => void activateRelationship()}>
            {t('pages.tenantRelationships.activateButton')}
          </VxButton>
        </VxDialogActions>
      </VxDialog>
      {activationDiscardDialog}
    </VxStack>
  )
}
