import { Fragment, useMemo, useState } from 'react'
import {
  Box,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from '@mui/material'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import { useTranslation } from 'react-i18next'
import type { ProductGridRow } from '../../../types/ui'
import { formatQuantity } from '../../../common/utils'
import ProductExpandedPanel from './ProductExpandedPanel'
import ProductPurchasePriceCell from './ProductPurchasePriceCell'

type ProductDataGridProps = {
  rows: ProductGridRow[]
  isLoading: boolean
  expandedProductIds: string[]
  onToggleExpanded: (productId: string) => void
  onEdit: (productId: string) => void
  onDelete: (row: ProductGridRow) => void
}

type ProductSortField = 'name' | 'quantityAvailable' | 'stockHealth'
type SortDirection = 'asc' | 'desc'

function compareRows(left: ProductGridRow, right: ProductGridRow, sortField: ProductSortField) {
  if (sortField === 'quantityAvailable') {
    return left.quantityAvailable - right.quantityAvailable
  }

  if (sortField === 'stockHealth') {
    const leftSeverity = left.isLowStock ? 0 : 1
    const rightSeverity = right.isLowStock ? 0 : 1

    if (leftSeverity !== rightSeverity) {
      return leftSeverity - rightSeverity
    }

    const gap = (left.activeQuantityAvailable - left.reorderLevel) - (right.activeQuantityAvailable - right.reorderLevel)
    if (gap !== 0) {
      return gap
    }
  }

  return left.name.localeCompare(right.name)
}

export default function ProductDataGrid({ rows, isLoading, expandedProductIds, onToggleExpanded, onEdit, onDelete }: ProductDataGridProps) {
  const { t } = useTranslation()
  const [sortField, setSortField] = useState<ProductSortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const sortedRows = useMemo(() => {
    const directionMultiplier = sortDirection === 'asc' ? 1 : -1

    return [...rows].sort((left, right) => directionMultiplier * compareRows(left, right, sortField))
  }, [rows, sortDirection, sortField])

  const handleSortRequest = (field: ProductSortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortField(field)
    setSortDirection(field === 'stockHealth' ? 'asc' : 'desc')
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 220 }}>
        <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
          <CircularProgress size={28} />
          <Typography color="text.secondary">{t('components.products.grid.loading')}</Typography>
        </Stack>
      </Box>
    )
  }

  if (!rows.length) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
        <Typography color="text.secondary">{t('components.products.grid.empty')}</Typography>
      </Box>
    )
  }

  return (
    <TableContainer>
      <Table sx={{ minWidth: 980 }}>
        <TableHead>
          <TableRow sx={{ backgroundColor: 'rgba(108, 92, 231, 0.06)' }}>
            <TableCell width={56} />
            <TableCell sortDirection={sortField === 'name' ? sortDirection : false}>
              <TableSortLabel
                active={sortField === 'name'}
                direction={sortField === 'name' ? sortDirection : 'asc'}
                onClick={() => handleSortRequest('name')}
              >
                {t('components.products.grid.columns.product')}
              </TableSortLabel>
            </TableCell>
            <TableCell>{t('components.products.grid.columns.uom')}</TableCell>
            <TableCell align="right">{t('components.products.grid.columns.salesPrice')}</TableCell>
            <TableCell align="right">{t('components.products.grid.columns.purchasePrice')}</TableCell>
            <TableCell align="right">{t('components.products.grid.columns.onHand')}</TableCell>
            <TableCell align="right">{t('components.products.grid.columns.reserved')}</TableCell>
            <TableCell align="right" sortDirection={sortField === 'quantityAvailable' ? sortDirection : false}>
              <TableSortLabel
                active={sortField === 'quantityAvailable'}
                direction={sortField === 'quantityAvailable' ? sortDirection : 'asc'}
                onClick={() => handleSortRequest('quantityAvailable')}
              >
                {t('components.products.grid.columns.available')}
              </TableSortLabel>
            </TableCell>
            <TableCell sortDirection={sortField === 'stockHealth' ? sortDirection : false}>
              <TableSortLabel
                active={sortField === 'stockHealth'}
                direction={sortField === 'stockHealth' ? sortDirection : 'asc'}
                onClick={() => handleSortRequest('stockHealth')}
              >
                {t('components.products.grid.columns.stockHealth')}
              </TableSortLabel>
            </TableCell>
            <TableCell>{t('components.products.grid.columns.status')}</TableCell>
            <TableCell align="right">{t('components.products.grid.columns.actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedRows.map((row) => {
            const isExpanded = expandedProductIds.includes(row.id)

            return (
              <Fragment key={row.id}>
                <TableRow
                  hover
                  sx={{
                    backgroundColor: row.isLowStock ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                    '& > *': { borderBottom: isExpanded ? 'none' : undefined },
                  }}
                >
                  <TableCell>
                    <IconButton size="small" onClick={() => onToggleExpanded(row.id)} aria-label={isExpanded ? t('components.products.grid.collapse') : t('components.products.grid.expand')}>
                      {isExpanded ? <KeyboardArrowUpRoundedIcon /> : <KeyboardArrowDownRoundedIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ py: 0.5 }}>
                      <Typography sx={{ fontWeight: 700 }}>{row.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{t('components.products.grid.skuPrefix')} {row.sku}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{row.unitOfMeasure}</TableCell>
                  <TableCell align="right">${row.salesPrice.toFixed(2)}</TableCell>
                  <TableCell align="right">
                    <ProductPurchasePriceCell productId={row.id} standardCost={row.standardCost} />
                  </TableCell>
                  <TableCell align="right">{formatQuantity(row.quantityOnHand)}</TableCell>
                  <TableCell align="right">{formatQuantity(row.quantityReserved)}</TableCell>
                  <TableCell align="right">{formatQuantity(row.quantityAvailable)}</TableCell>
                  <TableCell>
                    <Stack spacing={0.5} sx={{ py: 0.5 }}>
                      <Chip
                        size="small"
                        color={row.isLowStock ? 'warning' : 'success'}
                        variant={row.isLowStock ? 'filled' : 'outlined'}
                        label={row.isLowStock ? t('components.products.grid.lowStock') : t('components.products.grid.healthy')}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {t('components.products.grid.activeReorder', {
                          activeQuantity: formatQuantity(row.activeQuantityAvailable),
                          reorderLevel: formatQuantity(row.reorderLevel),
                        })}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={row.isActive ? 'primary' : 'default'}
                      label={row.isActive ? t('components.products.grid.active') : t('components.products.grid.inactive')}
                      variant={row.isActive ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                      <Tooltip title={t('common.edit')}>
                        <IconButton size="small" onClick={() => onEdit(row.id)}>
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('dialogs.delete')}>
                        <IconButton size="small" color="error" onClick={() => onDelete(row)}>
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={11} sx={{ py: 0, borderBottom: '1px solid rgba(108, 92, 231, 0.06)' }}>
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <ProductExpandedPanel row={row} />
                    </Collapse>
                  </TableCell>
                </TableRow>
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}