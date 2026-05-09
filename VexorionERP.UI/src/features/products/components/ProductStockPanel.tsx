import { Box, Button, Chip, Stack, Typography } from '@mui/material'
import { LaunchRoundedIcon } from '@vexorion/ui'
import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ProductGridRow } from '../../../types/ui'
import { formatQuantity } from '../../../common/utils'

type ProductStockPanelProps = {
  row: ProductGridRow
}

export default function ProductStockPanel({ row }: ProductStockPanelProps) {
  const { t } = useTranslation()

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 2, backgroundColor: 'rgba(15, 23, 42, 0.02)' }}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}>
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{t('components.products.grid.stockPanel.warehouseStock')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('components.products.grid.stockPanel.activeReorder', {
                activeQuantity: formatQuantity(row.activeQuantityAvailable),
                reorderLevel: formatQuantity(row.reorderLevel),
              })}
            </Typography>
          </Box>
          <Chip
            size="small"
            color={row.isLowStock ? 'warning' : 'success'}
            variant={row.isLowStock ? 'filled' : 'outlined'}
            label={row.isLowStock ? t('components.products.grid.lowStock') : t('components.products.grid.healthy')}
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
                        label={warehouse.isWarehouseActive ? t('components.products.grid.stockPanel.activeWarehouse') : t('components.products.grid.stockPanel.inactiveWarehouse')}
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
                    <Chip size="small" label={t('components.products.grid.stockPanel.onHand', { quantity: formatQuantity(warehouse.quantityOnHand) })} variant="outlined" />
                    <Chip size="small" label={t('components.products.grid.stockPanel.reserved', { quantity: formatQuantity(warehouse.quantityReserved) })} variant="outlined" />
                    <Chip size="small" label={t('components.products.grid.stockPanel.available', { quantity: formatQuantity(warehouse.quantityAvailable) })} variant="outlined" />
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography color="text.secondary">{t('components.products.grid.stockPanel.noWarehouseBalances')}</Typography>
        )}
      </Stack>
    </Box>
  )
}
