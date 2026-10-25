import { useCallback, useEffect, useState } from 'react'
import { VxAlert, VxButton, VxConfirmActionDialog, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxIconButton, VxStack, VxSwitch, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTextField, VxTooltip, VxTypography } from '@vexorion/ui'
import { AddIcon, DeleteIcon, EditIcon } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { Permissions } from '../../../app/authorization'
import MasterDataListPage from '../../../components/MasterDataListPage'
import MasterDataSearchField from '../../../components/MasterDataSearchField'
import { useUnsavedChangesPrompt } from '../../../hooks/useUnsavedChangesPrompt'
import {
  ApiError,
  createProductCategory,
  deleteProductCategory,
  getProductCategories,
  updateProductCategory,
} from '../../../lib/api'
import type { ProductCategoryListItemResponse } from '../../../types/api'

export default function ConfigProductCategoriesPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const canManage = user?.permissions.includes(Permissions.products.manage) ?? false
  const [categories, setCategories] = useState<ProductCategoryListItemResponse[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createBaseline, setCreateBaseline] = useState('')

  // Edit dialog state
  const [editTarget, setEditTarget] = useState<ProductCategoryListItemResponse | null>(null)
  const [editName, setEditName] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)
  const [editLoading, setEditLoading] = useState(false)
  const [editBaseline, setEditBaseline] = useState<{ name: string, isActive: boolean } | null>(null)

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<ProductCategoryListItemResponse | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const { requestClose: requestCreateClose, confirmationDialog: createDiscardDialog } = useUnsavedChangesPrompt(
    canManage && createOpen && createName !== createBaseline,
    createLoading,
    () => setCreateOpen(false),
    () => setCreateName(createBaseline),
  )
  const { requestClose: requestEditClose, confirmationDialog: editDiscardDialog } = useUnsavedChangesPrompt(
    canManage && Boolean(editTarget && editBaseline && (editName !== editBaseline.name || editIsActive !== editBaseline.isActive)),
    editLoading,
    () => setEditTarget(null),
    () => {
      if (!editBaseline) return
      setEditName(editBaseline.name)
      setEditIsActive(editBaseline.isActive)
    },
  )

  const loadCategories = useCallback(async () => {
    if (!isAuthenticated) {
      setCategories([])
      return
    }
    setError(null)
    try {
      const list = await getProductCategories()
      setCategories(list)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.errors.loadFailed'))
    }
  }, [isAuthenticated, t])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  const search = searchTerm.trim().toLowerCase()
  const visibleCategories = categories.filter((category) => category.name.toLowerCase().includes(search))

  const handleCreate = async () => {
    if (!canManage) return
    if (!createName.trim()) return
    setCreateLoading(true)
    setError(null)
    setFeedback(null)
    try {
      await createProductCategory({ name: createName.trim() })
      setCreateOpen(false)
      setCreateName('')
      setFeedback(t('config.productCategories.feedback.created'))
      await loadCategories()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.errors.saveFailed'))
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEdit = async () => {
    if (!canManage) return
    if (!editTarget || !editName.trim()) return
    setEditLoading(true)
    setError(null)
    setFeedback(null)
    try {
      await updateProductCategory(editTarget.id, { name: editName.trim(), isActive: editIsActive })
      setEditTarget(null)
      setFeedback(t('config.productCategories.feedback.updated'))
      await loadCategories()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.errors.saveFailed'))
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!canManage) return
    if (!deleteTarget) return
    setDeleteLoading(true)
    setError(null)
    setFeedback(null)
    try {
      await deleteProductCategory(deleteTarget.id)
      setDeleteTarget(null)
      setFeedback(t('config.productCategories.feedback.deleted'))
      await loadCategories()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.errors.deleteFailed'))
    } finally {
      setDeleteLoading(false)
    }
  }

  if (!isAuthenticated) {
    return <VxAlert severity="info">{t('common.signInRequired')}</VxAlert>
  }

  return (
    <>
      <MasterDataListPage
        title={t('config.productCategories.title')}
        description={t('config.productCategories.description')}
        filters={<MasterDataSearchField value={searchTerm} onChange={setSearchTerm} />}
        primaryAction={canManage ? <VxButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setCreateName(''); setCreateBaseline(''); setCreateOpen(true) }}
          >
            {t('config.productCategories.addButton')}
          </VxButton> : null}
        error={error}
        success={feedback}
        onRetry={error ? () => void loadCategories() : undefined}
        canManage={canManage}
        requiredPermission={Permissions.products.manage}
      >
        <VxTableContainer>
          <VxTable size="small">
            <VxTableHead>
              <VxTableRow>
                <VxTableCell>{t('config.productCategories.fields.name')}</VxTableCell>
                <VxTableCell>{t('config.productCategories.fields.isActive')}</VxTableCell>
                <VxTableCell align="right">{t('common.actions')}</VxTableCell>
              </VxTableRow>
            </VxTableHead>
            <VxTableBody>
              {visibleCategories.length === 0 ? (
                <VxTableRow>
                  <VxTableCell colSpan={3} align="center">
                    <VxTypography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      {categories.length === 0 ? t('config.productCategories.noRecords') : t('common.labels.noRecordsFound')}
                    </VxTypography>
                  </VxTableCell>
                </VxTableRow>
              ) : (
                visibleCategories.map((cat) => (
                  <VxTableRow key={cat.id}>
                    <VxTableCell>{cat.name}</VxTableCell>
                    <VxTableCell>{cat.isActive ? t('common.yes') : t('common.no')}</VxTableCell>
                    <VxTableCell align="right">
                      {canManage ? <>
                      <VxTooltip title={t('common.edit')}>
                        <VxIconButton
                          size="small"
                          onClick={() => { setEditTarget(cat); setEditName(cat.name); setEditIsActive(cat.isActive); setEditBaseline({ name: cat.name, isActive: cat.isActive }) }}
                          aria-label={t('common.edit')}
                        >
                          <EditIcon fontSize="small" />
                        </VxIconButton>
                      </VxTooltip>
                      <VxTooltip title={t('common.delete')}>
                        <VxIconButton size="small" color="error" onClick={() => setDeleteTarget(cat)} aria-label={t('common.delete')}>
                          <DeleteIcon fontSize="small" />
                        </VxIconButton>
                      </VxTooltip>
                      </> : null}
                    </VxTableCell>
                  </VxTableRow>
                ))
              )}
            </VxTableBody>
          </VxTable>
        </VxTableContainer>
      </MasterDataListPage>

      {/* Create VxDialog */}
      <VxDialog open={canManage && createOpen} onClose={requestCreateClose} maxWidth="xs" fullWidth>
        <VxDialogTitle>{t('config.productCategories.createDialog.title')}</VxDialogTitle>
        <VxDialogContent>
          <VxTextField
            autoFocus
            size="small"
            label={t('config.productCategories.fields.name')}
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={requestCreateClose} disabled={createLoading}>{t('common.cancel')}</VxButton>
          <VxButton variant="contained" onClick={() => void handleCreate()} disabled={!createName.trim() || createLoading}>
            {t('common.create')}
          </VxButton>
        </VxDialogActions>
      </VxDialog>
      {createDiscardDialog}

      {/* Edit VxDialog */}
      <VxDialog open={canManage && !!editTarget} onClose={requestEditClose} maxWidth="xs" fullWidth>
        <VxDialogTitle>{t('config.productCategories.editDialog.title')}</VxDialogTitle>
        <VxDialogContent>
          <VxStack spacing={2} sx={{ mt: 1 }}>
            <VxTextField
              autoFocus
              size="small"
              label={t('config.productCategories.fields.name')}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              fullWidth
              slotProps={{ htmlInput: { maxLength: 120 } }}
            />
            <VxSwitch
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
            />
          </VxStack>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={requestEditClose} disabled={editLoading}>{t('common.cancel')}</VxButton>
          <VxButton variant="contained" onClick={() => void handleEdit()} disabled={!editName.trim() || editLoading}>
            {t('common.save')}
          </VxButton>
        </VxDialogActions>
      </VxDialog>
      {editDiscardDialog}

      <VxConfirmActionDialog open={canManage && Boolean(deleteTarget)} title={t('config.productCategories.deleteDialog.title')} targetName={deleteTarget?.name ?? ''} consequence={t('config.productCategories.deleteDialog.message', { name: deleteTarget?.name })} confirmLabel={t('common.delete')} cancelLabel={t('common.cancel')} pendingLabel={t('dialogs.deleting')} pending={deleteLoading} onClose={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} />
    </>
  )
}
