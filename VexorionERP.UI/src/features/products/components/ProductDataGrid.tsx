import { Fragment, useMemo, useState } from 'react'
import {
  Box,
  Button,
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
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded'
import { Link as RouterLink } from 'react-router-dom'
import type { ProductGridRow } from '../../../types/ui'

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

function formatQuantity(value: number) {
  return value.toFixed(2)
}

function ProductStockPanel({ row }: { row: ProductGridRow }) {
  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 2, backgroundColor: 'rgba(15, 23, 42, 0.02)' }}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}>
          <Box>
            <Typography sx={{ fontWeight: 700 }}>Warehouse stock</Typography>
            <Typography variant="body2" color="text.secondary">
              Active available {formatQuantity(row.activeQuantityAvailable)} / reorder {formatQuantity(row.reorderLevel)}
            </Typography>
          </Box>
          <Chip
            size="small"
            color={row.isLowStock ? 'warning' : 'success'}
            variant={row.isLowStock ? 'filled' : 'outlined'}
            label={row.isLowStock ? 'Low stock' : 'Healthy'}
          />
        </Stack>

        {row.warehouseStock.length ? (
          <Stack spacing={1}>
            {row.warehouseStock.map((warehouse) => (
              <Box
                key={warehouse.warehouseId}
                sx={{
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  borderRadius: 3,
                  px: 2,
                  py: 1.5,
                  backgroundColor: warehouse.isWarehouseActive ? 'rgba(15, 23, 42, 0.02)' : 'rgba(120, 113, 108, 0.08)',
                }}
              >
                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { lg: 'center' } }}>
                  <Box>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography sx={{ fontWeight: 700 }}>{warehouse.warehouseName}</Typography>
                      <Chip
                        size="small"
                        label={warehouse.isWarehouseActive ? 'Active warehouse' : 'Inactive warehouse'}
                        color={warehouse.isWarehouseActive ? 'primary' : 'default'}
                        variant={warehouse.isWarehouseActive ? 'filled' : 'outlined'}
                      />
                    </Stack>
                    <Button
                      component={RouterLink}
                      to={`/warehouses?warehouseId=${warehouse.warehouseId}`}
                      size="small"
                      endIcon={<LaunchRoundedIcon />}
                      sx={{ px: 0, mt: 0.5 }}
                    >
                      {warehouse.warehouseCode}
                    </Button>
                  </Box>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Chip size="small" label={`On hand ${formatQuantity(warehouse.quantityOnHand)}`} variant="outlined" />
                    <Chip size="small" label={`Reserved ${formatQuantity(warehouse.quantityReserved)}`} variant="outlined" />
                    <Chip size="small" label={`Available ${formatQuantity(warehouse.quantityAvailable)}`} variant="outlined" />
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography color="text.secondary">No warehouse balances are posted for this product yet.</Typography>
        )}
      </Stack>
    </Box>
  )
}

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
          <Typography color="text.secondary">Loading product inventory...</Typography>
        </Stack>
      </Box>
    )
  }

  if (!rows.length) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
        <Typography color="text.secondary">No products match the current filters.</Typography>
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
                Product
              </TableSortLabel>
            </TableCell>
            <TableCell>UOM</TableCell>
            <TableCell align="right">Sales price</TableCell>
            <TableCell align="right">On hand</TableCell>
            <TableCell align="right">Reserved</TableCell>
            <TableCell align="right" sortDirection={sortField === 'quantityAvailable' ? sortDirection : false}>
              <TableSortLabel
                active={sortField === 'quantityAvailable'}
                direction={sortField === 'quantityAvailable' ? sortDirection : 'asc'}
                onClick={() => handleSortRequest('quantityAvailable')}
              >
                Available
              </TableSortLabel>
            </TableCell>
            <TableCell sortDirection={sortField === 'stockHealth' ? sortDirection : false}>
              <TableSortLabel
                active={sortField === 'stockHealth'}
                direction={sortField === 'stockHealth' ? sortDirection : 'asc'}
                onClick={() => handleSortRequest('stockHealth')}
              >
                Stock health
              </TableSortLabel>
            </TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
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
                    <IconButton size="small" onClick={() => onToggleExpanded(row.id)} aria-label={isExpanded ? 'Collapse stock details' : 'Expand stock details'}>
                      {isExpanded ? <KeyboardArrowUpRoundedIcon /> : <KeyboardArrowDownRoundedIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ py: 0.5 }}>
                      <Typography sx={{ fontWeight: 700 }}>{row.name}</Typography>
                      <Typography variant="body2" color="text.secondary">SKU {row.sku}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{row.unitOfMeasure}</TableCell>
                  <TableCell align="right">${row.salesPrice.toFixed(2)}</TableCell>
                  <TableCell align="right">{formatQuantity(row.quantityOnHand)}</TableCell>
                  <TableCell align="right">{formatQuantity(row.quantityReserved)}</TableCell>
                  <TableCell align="right">{formatQuantity(row.quantityAvailable)}</TableCell>
                  <TableCell>
                    <Stack spacing={0.5} sx={{ py: 0.5 }}>
                      <Chip
                        size="small"
                        color={row.isLowStock ? 'warning' : 'success'}
                        variant={row.isLowStock ? 'filled' : 'outlined'}
                        label={row.isLowStock ? 'Low stock' : 'Healthy'}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Active {formatQuantity(row.activeQuantityAvailable)} / reorder {formatQuantity(row.reorderLevel)}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={row.isActive ? 'primary' : 'default'}
                      label={row.isActive ? 'Active' : 'Inactive'}
                      variant={row.isActive ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => onEdit(row.id)}>
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => onDelete(row)}>
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={10} sx={{ py: 0, borderBottom: '1px solid rgba(108, 92, 231, 0.06)' }}>
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <ProductStockPanel row={row} />
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