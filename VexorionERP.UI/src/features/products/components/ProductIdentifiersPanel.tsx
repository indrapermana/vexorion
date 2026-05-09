import { useCallback, useEffect, useState } from 'react'
import { AddRoundedIcon, DeleteOutlineRoundedIcon, EditRoundedIcon } from '@vexorion/ui'
import { VxAlert, VxBox, VxButton, VxChip, VxCircularProgress, VxDialog, VxDialogActions, VxDialogContent, VxDialogContentText, VxDialogTitle, VxFormControlLabel, VxIconButton, VxMenuItem, VxStack, VxSwitch, VxTable, VxTableBody, VxTableCell, VxTableHead, VxTableRow, VxTextField, VxTooltip, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import {
  ApiError,
  createProductIdentifier,
  deleteProductIdentifier,
  getProductIdentifiers,
  updateProductIdentifier,
} from '../../../lib/api'
import type { ProductIdentifierListItemResponse } from '../../../types/api'

const CODE_TYPE_OPTIONS = ['EAN13', 'UPC-A', 'UPC-E', 'CODE128', 'QR', 'ITF14', 'INTERNAL']

type ProductIdentifiersPanelProps = {
  productId: string
}

export default function ProductIdentifiersPanel({ productId }: ProductIdentifiersPanelProps) {
  const { t } = useTranslation()
  const [identifiers, setIdentifiers] = useState<ProductIdentifierListItemResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createCodeType, setCreateCodeType] = useState('EAN13')
  const [createCodeValue, setCreateCodeValue] = useState('')
  const [createIsPrimary, setCreateIsPrimary] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // edit dialog
  const [editTarget, setEditTarget] = useState<ProductIdentifierListItemResponse | null>(null)
  const [editCodeType, setEditCodeType] = useState('')
  const [editCodeValue, setEditCodeValue] = useState('')
  const [editIsPrimary, setEditIsPrimary] = useState(false)
  const [editIsActive, setEditIsActive] = useState(true)

  // delete dialog
  const [deleteTarget, setDeleteTarget] = useState<ProductIdentifierListItemResponse | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getProductIdentifiers(productId)
      setIdentifiers(result)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('components.products.identifiers.loadError'))
    } finally {
      setIsLoading(false)
    }
  }, [productId, t])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setCreateCodeType('EAN13')
    setCreateCodeValue('')
    setCreateIsPrimary(false)
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    setIsSaving(true)
    setError(null)
    try {
      await createProductIdentifier({ productId, codeType: createCodeType, codeValue: createCodeValue, isPrimary: createIsPrimary })
      setCreateOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('components.products.identifiers.saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  const openEdit = (item: ProductIdentifierListItemResponse) => {
    setEditTarget(item)
    setEditCodeType(item.codeType)
    setEditCodeValue(item.codeValue)
    setEditIsPrimary(item.isPrimary)
    setEditIsActive(item.isActive)
  }

  const handleUpdate = async () => {
    if (!editTarget) return
    setIsSaving(true)
    setError(null)
    try {
      await updateProductIdentifier(editTarget.id, {
        codeType: editCodeType,
        codeValue: editCodeValue,
        isPrimary: editIsPrimary,
        isActive: editIsActive,
      })
      setEditTarget(null)
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('components.products.identifiers.saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setError(null)
    try {
      await deleteProductIdentifier(deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('components.products.identifiers.deleteError'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <VxBox sx={{ px: { xs: 2, md: 3 }, py: 2, backgroundColor: 'rgba(15, 23, 42, 0.02)' }}>
      <VxStack spacing={1.5}>
        <VxStack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <VxTypography sx={{ fontWeight: 700 }}>{t('components.products.identifiers.title')}</VxTypography>
          <VxButton size="small" startIcon={<AddRoundedIcon />} onClick={openCreate}>
            {t('components.products.identifiers.addButton')}
          </VxButton>
        </VxStack>

        {error ? <VxAlert severity="error" onClose={() => setError(null)}>{error}</VxAlert> : null}

        {isLoading ? (
          <VxBox sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <VxCircularProgress size={24} />
          </VxBox>
        ) : identifiers.length === 0 ? (
          <VxTypography color="text.secondary" variant="body2">
            {t('components.products.identifiers.empty')}
          </VxTypography>
        ) : (
          <VxTable size="small">
            <VxTableHead>
              <VxTableRow>
                <VxTableCell>{t('components.products.identifiers.columns.codeType')}</VxTableCell>
                <VxTableCell>{t('components.products.identifiers.columns.codeValue')}</VxTableCell>
                <VxTableCell>{t('components.products.identifiers.columns.isPrimary')}</VxTableCell>
                <VxTableCell>{t('components.products.identifiers.columns.status')}</VxTableCell>
                <VxTableCell align="right">{t('common.actions')}</VxTableCell>
              </VxTableRow>
            </VxTableHead>
            <VxTableBody>
              {identifiers.map((item) => (
                <VxTableRow key={item.id} hover>
                  <VxTableCell>
                    <VxChip size="small" label={item.codeType} variant="outlined" />
                  </VxTableCell>
                  <VxTableCell>
                    <VxTypography variant="body2" sx={{ fontFamily: 'monospace' }}>{item.codeValue}</VxTypography>
                  </VxTableCell>
                  <VxTableCell>
                    {item.isPrimary ? (
                      <VxChip size="small" label={t('components.products.identifiers.primary')} color="primary" />
                    ) : null}
                  </VxTableCell>
                  <VxTableCell>
                    <VxChip
                      size="small"
                      label={item.isActive ? t('components.products.grid.active') : t('components.products.grid.inactive')}
                      color={item.isActive ? 'success' : 'default'}
                      variant={item.isActive ? 'filled' : 'outlined'}
                    />
                  </VxTableCell>
                  <VxTableCell align="right">
                    <VxStack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                      <VxTooltip title={t('common.edit')}>
                        <VxIconButton size="small" onClick={() => openEdit(item)}>
                          <EditRoundedIcon fontSize="small" />
                        </VxIconButton>
                      </VxTooltip>
                      <VxTooltip title={t('dialogs.delete')}>
                        <VxIconButton size="small" color="error" onClick={() => setDeleteTarget(item)}>
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </VxIconButton>
                      </VxTooltip>
                    </VxStack>
                  </VxTableCell>
                </VxTableRow>
              ))}
            </VxTableBody>
          </VxTable>
        )}
      </VxStack>

      {/* Create dialog */}
      <VxDialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <VxDialogTitle>{t('components.products.identifiers.createDialog.title')}</VxDialogTitle>
        <VxDialogContent>
          <VxStack spacing={2} sx={{ pt: 1 }}>
            <VxTextField
              select
              size="small"
              label={t('components.products.identifiers.columns.codeType')}
              value={createCodeType}
              onChange={(e) => setCreateCodeType(e.target.value)}
              fullWidth
            >
              {CODE_TYPE_OPTIONS.map((opt) => (
                <VxMenuItem key={opt} value={opt}>{opt}</VxMenuItem>
              ))}
            </VxTextField>
            <VxTextField
              size="small"
              label={t('components.products.identifiers.columns.codeValue')}
              value={createCodeValue}
              onChange={(e) => setCreateCodeValue(e.target.value)}
              fullWidth
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
            <VxFormControlLabel
              control={<VxSwitch checked={createIsPrimary} onChange={(e) => setCreateIsPrimary(e.target.checked)} />}
              label={t('components.products.identifiers.columns.isPrimary')}
            />
          </VxStack>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={() => setCreateOpen(false)}>{t('common.cancel')}</VxButton>
          <VxButton
            variant="contained"
            onClick={() => void handleCreate()}
            disabled={isSaving || !createCodeValue.trim()}
          >
            {t('common.create')}
          </VxButton>
        </VxDialogActions>
      </VxDialog>

      {/* Edit dialog */}
      <VxDialog open={editTarget !== null} onClose={() => setEditTarget(null)} maxWidth="xs" fullWidth>
        <VxDialogTitle>{t('components.products.identifiers.editDialog.title')}</VxDialogTitle>
        <VxDialogContent>
          <VxStack spacing={2} sx={{ pt: 1 }}>
            <VxTextField
              select
              size="small"
              label={t('components.products.identifiers.columns.codeType')}
              value={editCodeType}
              onChange={(e) => setEditCodeType(e.target.value)}
              fullWidth
            >
              {CODE_TYPE_OPTIONS.map((opt) => (
                <VxMenuItem key={opt} value={opt}>{opt}</VxMenuItem>
              ))}
            </VxTextField>
            <VxTextField
              size="small"
              label={t('components.products.identifiers.columns.codeValue')}
              value={editCodeValue}
              onChange={(e) => setEditCodeValue(e.target.value)}
              fullWidth
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
            <VxFormControlLabel
              control={<VxSwitch checked={editIsPrimary} onChange={(e) => setEditIsPrimary(e.target.checked)} />}
              label={t('components.products.identifiers.columns.isPrimary')}
            />
            <VxFormControlLabel
              control={<VxSwitch checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} />}
              label={t('components.products.grid.active')}
            />
          </VxStack>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={() => setEditTarget(null)}>{t('common.cancel')}</VxButton>
          <VxButton
            variant="contained"
            onClick={() => void handleUpdate()}
            disabled={isSaving || !editCodeValue.trim()}
          >
            {t('common.save')}
          </VxButton>
        </VxDialogActions>
      </VxDialog>

      {/* Delete dialog */}
      <VxDialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <VxDialogTitle>{t('components.products.identifiers.deleteDialog.title')}</VxDialogTitle>
        <VxDialogContent>
          <VxDialogContentText>
            {t('components.products.identifiers.deleteDialog.message', {
              codeType: deleteTarget?.codeType,
              codeValue: deleteTarget?.codeValue,
            })}
          </VxDialogContentText>
        </VxDialogContent>
        <VxDialogActions>
          <VxButton onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</VxButton>
          <VxButton
            color="error"
            variant="contained"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
          >
            {t('common.delete')}
          </VxButton>
        </VxDialogActions>
      </VxDialog>
    </VxBox>
  )
}
