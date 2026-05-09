import { useCallback, useEffect, useState } from 'react'
import { AddRoundedIcon, DeleteOutlineRoundedIcon, EditRoundedIcon } from '@vexorion/ui'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
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
    <Box sx={{ px: { xs: 2, md: 3 }, py: 2, backgroundColor: 'rgba(15, 23, 42, 0.02)' }}>
      <Stack spacing={1.5}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 700 }}>{t('components.products.identifiers.title')}</Typography>
          <Button size="small" startIcon={<AddRoundedIcon />} onClick={openCreate}>
            {t('components.products.identifiers.addButton')}
          </Button>
        </Stack>

        {error ? <Alert severity="error" onClose={() => setError(null)}>{error}</Alert> : null}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : identifiers.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            {t('components.products.identifiers.empty')}
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('components.products.identifiers.columns.codeType')}</TableCell>
                <TableCell>{t('components.products.identifiers.columns.codeValue')}</TableCell>
                <TableCell>{t('components.products.identifiers.columns.isPrimary')}</TableCell>
                <TableCell>{t('components.products.identifiers.columns.status')}</TableCell>
                <TableCell align="right">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {identifiers.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Chip size="small" label={item.codeType} variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{item.codeValue}</Typography>
                  </TableCell>
                  <TableCell>
                    {item.isPrimary ? (
                      <Chip size="small" label={t('components.products.identifiers.primary')} color="primary" />
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={item.isActive ? t('components.products.grid.active') : t('components.products.grid.inactive')}
                      color={item.isActive ? 'success' : 'default'}
                      variant={item.isActive ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                      <Tooltip title={t('common.edit')}>
                        <IconButton size="small" onClick={() => openEdit(item)}>
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('dialogs.delete')}>
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(item)}>
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Stack>

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('components.products.identifiers.createDialog.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              size="small"
              label={t('components.products.identifiers.columns.codeType')}
              value={createCodeType}
              onChange={(e) => setCreateCodeType(e.target.value)}
              fullWidth
            >
              {CODE_TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label={t('components.products.identifiers.columns.codeValue')}
              value={createCodeValue}
              onChange={(e) => setCreateCodeValue(e.target.value)}
              fullWidth
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
            <FormControlLabel
              control={<Switch checked={createIsPrimary} onChange={(e) => setCreateIsPrimary(e.target.checked)} />}
              label={t('components.products.identifiers.columns.isPrimary')}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={() => void handleCreate()}
            disabled={isSaving || !createCodeValue.trim()}
          >
            {t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editTarget !== null} onClose={() => setEditTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('components.products.identifiers.editDialog.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              size="small"
              label={t('components.products.identifiers.columns.codeType')}
              value={editCodeType}
              onChange={(e) => setEditCodeType(e.target.value)}
              fullWidth
            >
              {CODE_TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label={t('components.products.identifiers.columns.codeValue')}
              value={editCodeValue}
              onChange={(e) => setEditCodeValue(e.target.value)}
              fullWidth
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
            <FormControlLabel
              control={<Switch checked={editIsPrimary} onChange={(e) => setEditIsPrimary(e.target.checked)} />}
              label={t('components.products.identifiers.columns.isPrimary')}
            />
            <FormControlLabel
              control={<Switch checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} />}
              label={t('components.products.grid.active')}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTarget(null)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={() => void handleUpdate()}
            disabled={isSaving || !editCodeValue.trim()}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('components.products.identifiers.deleteDialog.title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('components.products.identifiers.deleteDialog.message', {
              codeType: deleteTarget?.codeType,
              codeValue: deleteTarget?.codeValue,
            })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
          >
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
