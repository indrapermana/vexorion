import { useCallback, useEffect, useState } from 'react'
import { EditRoundedIcon, VxAlert, VxBox, VxButton, VxCircularProgress, VxStack, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../../../app/CurrencyContext'
import { ApiError, getProduct } from '../../../lib/api'
import type { ProductDetailsResponse } from '../../../types/api'
import type { ProductGridRow } from '../../../types/ui'

type ProductDetailsPanelProps = {
  row: ProductGridRow
  canManage: boolean
  onEdit: (productId: string) => void
}

export default function ProductDetailsPanel({ row, canManage, onEdit }: ProductDetailsPanelProps) {
  const { t } = useTranslation()
  const { formatMoney } = useCurrency()
  const [product, setProduct] = useState<ProductDetailsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setProduct(await getProduct(row.id))
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('components.products.details.loadError'))
    } finally {
      setIsLoading(false)
    }
  }, [row.id, t])

  useEffect(() => {
    void load()
  }, [load])

  if (isLoading) {
    return <VxStack role="status" direction="row" spacing={1} sx={{ alignItems: 'center', py: 2 }}><VxCircularProgress size={20} /><VxTypography>{t('components.products.details.loading')}</VxTypography></VxStack>
  }

  if (error || !product) {
    return <VxAlert severity="error" action={<VxButton color="inherit" size="small" onClick={() => void load()}>{t('common.retry')}</VxButton>}>{error ?? t('components.products.details.loadError')}</VxAlert>
  }

  const details = [
    ['sku', product.sku],
    ['unitOfMeasure', product.unitOfMeasure],
    ['salesPrice', formatMoney(product.salesPrice)],
    ['standardCost', formatMoney(product.standardCost)],
    ['reorderLevel', product.reorderLevel],
    ['status', t(product.isActive ? 'components.products.grid.active' : 'components.products.grid.inactive')],
  ] as const

  return (
    <VxStack spacing={2} sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
      <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' } }}>
        <VxStack direction="row" spacing={2} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
          {product.imageUrl ? <VxBox component="img" src={product.imageUrl} alt={t('components.products.details.imageAlt', { name: product.name })} sx={{ width: 88, height: 88, objectFit: 'contain', flexShrink: 0 }} /> : null}
          <VxBox sx={{ minWidth: 0 }}>
            <VxTypography component="h3" variant="subtitle1" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{product.name}</VxTypography>
            <VxTypography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{product.description || t('components.products.details.noDescription')}</VxTypography>
          </VxBox>
        </VxStack>
        {canManage ? <VxButton size="small" variant="outlined" startIcon={<EditRoundedIcon />} onClick={() => onEdit(product.id)}>{t('common.edit')}</VxButton> : null}
      </VxStack>
      <VxBox component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 1.5 }}>
        {details.map(([key, value]) => (
          <VxBox key={key} sx={{ minWidth: 0 }}>
            <VxTypography component="dt" variant="caption" color="text.secondary">{t(`components.products.details.fields.${key}`)}</VxTypography>
            <VxTypography component="dd" variant="body2" sx={{ m: 0, overflowWrap: 'anywhere' }}>{value}</VxTypography>
          </VxBox>
        ))}
      </VxBox>
      <VxTypography variant="caption" color="text.secondary">{t('components.products.details.pricingNote')}</VxTypography>
    </VxStack>
  )
}