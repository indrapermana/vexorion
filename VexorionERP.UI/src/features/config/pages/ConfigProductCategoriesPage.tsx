import { useCallback, useEffect, useState } from 'react'
import { VxAlert, VxButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxIconButton, VxPaper, VxStack, VxSwitch, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTextField, VxTooltip, VxTypography } from '@vexorion/ui'
import { AddIcon, DeleteIcon, EditIcon } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
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
  const { isAuthenticated } = useAuth()
  const [categories, setCategories] = useState<ProductCategoryListItemResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  // Edit dialog state
  const [editTarget, setEditTarget] = useState<ProductCategoryListItemResponse | null>(null)
  const [editName, setEditName] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)
  const [editLoading, setEditLoading] = useState(false)

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<ProductCategoryListItemResponse | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

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

  const handleCreate = async () => {
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
    <VxStack spacing={3}>
      <VxPaper elevation={0} className="panel-card">
        <VxStack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <VxTypography variant="h4" sx={{ mb: 1 }}>{t('config.productCategories.title')}</VxTypography>
            <VxTypography color="text.secondary">{t('config.productCategories.description')}</VxTypography>
          </div>
          <VxButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setCreateName(''); setCreateOpen(true) }}
          >
            {t('config.productCategories.addButton')}
          </VxButton>
        </VxStack>
      </VxPaper>

      {error ? <VxAlert severity="error">{error}</VxAlert> : null}
      {feedback ? <VxAlert severity="success">{feedback}</VxAlert> : null}

      <VxPaper elevation={0} className="panel-card" sx={{ p: 0 }}>
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
              {categories.length === 0 ? (
                <VxTableRow>
                  <VxTableCell colSpan={3} align="center">
                    <VxTypography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      {t('config.productCategories.noRecords')}
                    </VxTypography>
                  </VxTableCell>
                </VxTableRow>
              ) : (
                categories.map((cat) => (
                  <VxTableRow key={cat.id}>
                    <VxTableCell>{cat.name}</VxTableCell>
                    <VxTableCell>{cat.isActive ? t('common.yes') : t('common.no')}</VxTableCell>
                    <VxTableCell align="right">
                      <VxTooltip title={t('common.edit')}>
                        <VxIconButton
                          size="small"
                          onClick={() => { setEditTarget(cat); setEditName(cat.name); setEditIsActive(cat.isActive) }}
                        >
                          <EditIcon fontSize="small" />
                        </VxIconButton>
                      </VxTooltip>
                      <VxTooltip title={t('common.delete')}>
                        <VxIconButton size="small" color="error" onClick={() => setDeleteTarget(cat)}>
                          <DeleteIcon fontSize="small" />
                        </VxIconButton>
                      </VxTooltip>
                    </VxTableCell>
                  </VxTableRow>
                ))
              )}
            </VxTableBody>
          </VxTable>
        </VxTableContainer>
      </VxPaper>

      {/* Create VxDialog */}
      <VxDialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
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
          <VxButton onClick={() => setCreateOpen(false)}>{t('common.cancel')}</VxButton>
          <VxButton variant="contained" onClick={() => void handleCreate()} disabled={!createName.trim() || createLoading}>
            {t('common.create')}
          </VxButton>
        </VxDialogActions>
      </VxDialog>

      {/* Edit VxDialog */}
      <VxDialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="xs" fullWidth>
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
          <VxButton onClick={() => setEditTarget(null)}>{t('common.cancel')}</VxButton>
          <VxButton variant="contained" onClick={() => void handleEdit()} disabled={!editName.trim() || editLoading}>
            {t('common.save')}
          </VxButton>
        </VxDialogActions>
      </VxDialog>

      {/* Delete VxDialog */}
      <VxDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <VxDialogTitle>{t('config.productCategories.deleteDialog.title')}</VxDialogTitle>
        <VxDialogContent>
          <VxTypography>
            {t('config.productCategories.deleteDialog.message', { name: deleteTarget?.name })}
          </VxTypography>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</VxButton>
          <VxButton variant="contained" color="error" onClick={() => void handleDelete()} disabled={deleteLoading}>
            {t('common.delete')}
          </VxButton>
        </VxDialogActions>
      </VxDialog>
    </VxStack>
  )
}
