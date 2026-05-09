import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
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
    return <Alert severity="info">{t('common.signInRequired')}</Alert>
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Typography variant="h4" sx={{ mb: 1 }}>{t('config.productCategories.title')}</Typography>
            <Typography color="text.secondary">{t('config.productCategories.description')}</Typography>
          </div>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setCreateName(''); setCreateOpen(true) }}
          >
            {t('config.productCategories.addButton')}
          </Button>
        </Stack>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {feedback ? <Alert severity="success">{feedback}</Alert> : null}

      <Paper elevation={0} className="panel-card" sx={{ p: 0 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('config.productCategories.fields.name')}</TableCell>
                <TableCell>{t('config.productCategories.fields.isActive')}</TableCell>
                <TableCell align="right">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      {t('config.productCategories.noRecords')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>{cat.name}</TableCell>
                    <TableCell>{cat.isActive ? t('common.yes') : t('common.no')}</TableCell>
                    <TableCell align="right">
                      <Tooltip title={t('common.edit')}>
                        <IconButton
                          size="small"
                          onClick={() => { setEditTarget(cat); setEditName(cat.name); setEditIsActive(cat.isActive) }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('common.delete')}>
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(cat)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('config.productCategories.createDialog.title')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            size="small"
            label={t('config.productCategories.fields.name')}
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={() => void handleCreate()} disabled={!createName.trim() || createLoading}>
            {t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('config.productCategories.editDialog.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              size="small"
              label={t('config.productCategories.fields.name')}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              fullWidth
              slotProps={{ htmlInput: { maxLength: 120 } }}
            />
            <Switch
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTarget(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={() => void handleEdit()} disabled={!editName.trim() || editLoading}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('config.productCategories.deleteDialog.title')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('config.productCategories.deleteDialog.message', { name: deleteTarget?.name })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={() => void handleDelete()} disabled={deleteLoading}>
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
