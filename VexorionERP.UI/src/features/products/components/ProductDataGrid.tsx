import { Fragment, useMemo, useState } from 'react'
import { VxBox, VxChip, VxCircularProgress, VxCollapse, VxIconButton, VxStack, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTableSortLabel, VxTooltip, VxTypography } from '@vexorion/ui'
import { DeleteOutlineRoundedIcon, EditRoundedIcon, KeyboardArrowDownRoundedIcon, KeyboardArrowUpRoundedIcon } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../../../app/CurrencyContext'
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
  const { formatMoney } = useCurrency()
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
      <VxBox sx={{ display: 'grid', placeItems: 'center', minHeight: 220 }}>
        <VxStack spacing={1.5} sx={{ alignItems: 'center' }}>
          <VxCircularProgress size={28} />
          <VxTypography color="text.secondary">{t('components.products.grid.loading')}</VxTypography>
        </VxStack>
      </VxBox>
    )
  }

  if (!rows.length) {
    return (
      <VxBox sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
        <VxTypography color="text.secondary">{t('components.products.grid.empty')}</VxTypography>
      </VxBox>
    )
  }

  return (
    <VxTableContainer>
      <VxTable sx={{ minWidth: 980 }}>
        <VxTableHead>
          <VxTableRow sx={{ backgroundColor: 'rgba(108, 92, 231, 0.06)' }}>
            <VxTableCell width={56} />
            <VxTableCell sortDirection={sortField === 'name' ? sortDirection : false}>
              <VxTableSortLabel
                active={sortField === 'name'}
                direction={sortField === 'name' ? sortDirection : 'asc'}
                onClick={() => handleSortRequest('name')}
              >
                {t('components.products.grid.columns.product')}
              </VxTableSortLabel>
            </VxTableCell>
            <VxTableCell>{t('components.products.grid.columns.uom')}</VxTableCell>
            <VxTableCell align="right">{t('components.products.grid.columns.salesPrice')}</VxTableCell>
            <VxTableCell align="right">{t('components.products.grid.columns.purchasePrice')}</VxTableCell>
            <VxTableCell align="right">{t('components.products.grid.columns.onHand')}</VxTableCell>
            <VxTableCell align="right">{t('components.products.grid.columns.reserved')}</VxTableCell>
            <VxTableCell align="right" sortDirection={sortField === 'quantityAvailable' ? sortDirection : false}>
              <VxTableSortLabel
                active={sortField === 'quantityAvailable'}
                direction={sortField === 'quantityAvailable' ? sortDirection : 'asc'}
                onClick={() => handleSortRequest('quantityAvailable')}
              >
                {t('components.products.grid.columns.available')}
              </VxTableSortLabel>
            </VxTableCell>
            <VxTableCell sortDirection={sortField === 'stockHealth' ? sortDirection : false}>
              <VxTableSortLabel
                active={sortField === 'stockHealth'}
                direction={sortField === 'stockHealth' ? sortDirection : 'asc'}
                onClick={() => handleSortRequest('stockHealth')}
              >
                {t('components.products.grid.columns.stockHealth')}
              </VxTableSortLabel>
            </VxTableCell>
            <VxTableCell>{t('components.products.grid.columns.status')}</VxTableCell>
            <VxTableCell align="right">{t('components.products.grid.columns.actions')}</VxTableCell>
          </VxTableRow>
        </VxTableHead>
        <VxTableBody>
          {sortedRows.map((row) => {
            const isExpanded = expandedProductIds.includes(row.id)

            return (
              <Fragment key={row.id}>
                <VxTableRow
                  hover
                  sx={{
                    backgroundColor: row.isLowStock ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                    '& > *': { borderBottom: isExpanded ? 'none' : undefined },
                  }}
                >
                  <VxTableCell>
                    <VxIconButton size="small" onClick={() => onToggleExpanded(row.id)} aria-label={isExpanded ? t('components.products.grid.collapse') : t('components.products.grid.expand')}>
                      {isExpanded ? <KeyboardArrowUpRoundedIcon /> : <KeyboardArrowDownRoundedIcon />}
                    </VxIconButton>
                  </VxTableCell>
                  <VxTableCell>
                    <VxBox sx={{ py: 0.5 }}>
                      <VxTypography sx={{ fontWeight: 700 }}>{row.name}</VxTypography>
                      <VxTypography variant="body2" color="text.secondary">{t('components.products.grid.skuPrefix')} {row.sku}</VxTypography>
                    </VxBox>
                  </VxTableCell>
                  <VxTableCell>{row.unitOfMeasure}</VxTableCell>
                  <VxTableCell align="right">{formatMoney(row.salesPrice)}</VxTableCell>
                  <VxTableCell align="right">
                    <ProductPurchasePriceCell productId={row.id} standardCost={row.standardCost} />
                  </VxTableCell>
                  <VxTableCell align="right">{formatQuantity(row.quantityOnHand)}</VxTableCell>
                  <VxTableCell align="right">{formatQuantity(row.quantityReserved)}</VxTableCell>
                  <VxTableCell align="right">{formatQuantity(row.quantityAvailable)}</VxTableCell>
                  <VxTableCell>
                    <VxStack spacing={0.5} sx={{ py: 0.5 }}>
                      <VxChip
                        size="small"
                        color={row.isLowStock ? 'warning' : 'success'}
                        variant={row.isLowStock ? 'filled' : 'outlined'}
                        label={row.isLowStock ? t('components.products.grid.lowStock') : t('components.products.grid.healthy')}
                      />
                      <VxTypography variant="caption" color="text.secondary">
                        {t('components.products.grid.activeReorder', {
                          activeQuantity: formatQuantity(row.activeQuantityAvailable),
                          reorderLevel: formatQuantity(row.reorderLevel),
                        })}
                      </VxTypography>
                    </VxStack>
                  </VxTableCell>
                  <VxTableCell>
                    <VxChip
                      size="small"
                      color={row.isActive ? 'primary' : 'default'}
                      label={row.isActive ? t('components.products.grid.active') : t('components.products.grid.inactive')}
                      variant={row.isActive ? 'filled' : 'outlined'}
                    />
                  </VxTableCell>
                  <VxTableCell align="right">
                    <VxStack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                      <VxTooltip title={t('common.edit')}>
                        <VxIconButton size="small" onClick={() => onEdit(row.id)}>
                          <EditRoundedIcon fontSize="small" />
                        </VxIconButton>
                      </VxTooltip>
                      <VxTooltip title={t('dialogs.delete')}>
                        <VxIconButton size="small" color="error" onClick={() => onDelete(row)}>
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </VxIconButton>
                      </VxTooltip>
                    </VxStack>
                  </VxTableCell>
                </VxTableRow>
                <VxTableRow>
                  <VxTableCell colSpan={11} sx={{ py: 0, borderBottom: '1px solid rgba(108, 92, 231, 0.06)' }}>
                    <VxCollapse in={isExpanded} timeout="auto" unmountOnExit>
                      <ProductExpandedPanel row={row} />
                    </VxCollapse>
                  </VxTableCell>
                </VxTableRow>
              </Fragment>
            )
          })}
        </VxTableBody>
      </VxTable>
    </VxTableContainer>
  )
}