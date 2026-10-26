import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { VxAlert, VxBox, VxCircularProgress, VxMenuItem, VxPagination, VxPaper, VxStack, VxTab, VxTable, VxTableBody, VxTableCell, VxTableContainer, VxTableHead, VxTableRow, VxTabs, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { useCurrency } from '../../../app/CurrencyContext'
import { PageFeedback, PageHeader } from '../../../components/PagePrimitives'
import { useWarehousesLookup } from '../../../hooks/useLookups'
import { ApiError, getInventoryMovementAuditReport, getInventoryReorderReport, getInventoryValuationReport } from '../../../lib/api'
import { getIntlLocale } from '../../../i18n/translationConstant'

function asDateInput(date: Date) {
  return date.toISOString().slice(0, 10)
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

export default function InventoryReportsPage() {
  const { t, i18n } = useTranslation()
  const { isAuthenticated } = useAuth()
  const { formatMoney } = useCurrency()
  const { items: warehouses, error: warehousesError } = useWarehousesLookup(isAuthenticated)
  const [tab, setTab] = useState(0)
  const [warehouseId, setWarehouseId] = useState('')
  const [startDate, setStartDate] = useState(() => asDateInput(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)))
  const [endDate, setEndDate] = useState(() => asDateInput(new Date()))
  const [page, setPage] = useState(0)
  const pageSize = 50
  const invalidDateRange = Boolean(startDate && endDate && startDate > endDate)
  const locale = getIntlLocale(i18n.language)
  const formatQuantity = (value: number) => value.toLocaleString(locale, { maximumFractionDigits: 2 })
  const formatDateTime = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))

  const valuationQuery = useQuery({
    queryKey: ['inventoryReports', 'valuation', warehouseId],
    queryFn: () => getInventoryValuationReport(warehouseId || undefined),
    enabled: isAuthenticated,
  })
  const movementQuery = useQuery({
    queryKey: ['inventoryReports', 'movementAudit', startDate, endDate, warehouseId, page, pageSize],
    queryFn: () => getInventoryMovementAuditReport({
      startDate,
      endDate,
      warehouseId: warehouseId || undefined,
      skip: page * pageSize,
      take: pageSize,
    }),
    enabled: isAuthenticated && !invalidDateRange,
  })
  const reorderQuery = useQuery({
    queryKey: ['inventoryReports', 'reorderRecommendations'],
    queryFn: getInventoryReorderReport,
    enabled: isAuthenticated,
  })

  if (!isAuthenticated) {
    return <VxAlert severity="info">{t('pages.inventoryReports.signInRequired')}</VxAlert>
  }

  const queryError = valuationQuery.error ?? movementQuery.error ?? reorderQuery.error ?? warehousesError
  const retryReports = () => {
    void Promise.all([valuationQuery.refetch(), movementQuery.refetch(), reorderQuery.refetch()])
  }

  return (
    <VxStack spacing={2.5}>
      <PageHeader
        title={t('nav.routeTitles.inventoryReports')}
        description={t('pages.inventoryReports.description')}
        filters={(
          <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            {tab < 2 ? (
              <VxTextField
                select
                size="small"
                label={t('pages.inventoryReports.filters.warehouse')}
                value={warehouseId}
                onChange={(event) => { setWarehouseId(event.target.value); setPage(0) }}
                sx={{ minWidth: 200 }}
              >
                <VxMenuItem value="">{t('pages.inventoryReports.filters.allWarehouses')}</VxMenuItem>
                {warehouses.map((warehouse) => <VxMenuItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</VxMenuItem>)}
              </VxTextField>
            ) : null}
            {tab === 1 ? (
              <>
                <VxTextField
                  size="small"
                  type="date"
                  label={t('pages.inventoryReports.filters.startDate')}
                  value={startDate}
                  onChange={(event) => { setStartDate(event.target.value); setPage(0) }}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <VxTextField
                  size="small"
                  type="date"
                  label={t('pages.inventoryReports.filters.endDate')}
                  value={endDate}
                  onChange={(event) => { setEndDate(event.target.value); setPage(0) }}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </>
            ) : null}
          </VxStack>
        )}
      />

      <PageFeedback error={queryError ? errorMessage(queryError, t('pages.inventoryReports.errors.load')) : null} onRetry={queryError ? retryReports : undefined} />

      <VxTabs value={tab} onChange={(_, value: number) => setTab(value)} variant="scrollable" scrollButtons="auto" aria-label={t('pages.inventoryReports.tabs.label')}>
        <VxTab label={t('pages.inventoryReports.tabs.valuation')} />
        <VxTab label={t('pages.inventoryReports.tabs.movementAudit')} />
        <VxTab label={t('pages.inventoryReports.tabs.reorder')} />
      </VxTabs>

      {tab === 0 ? (
        <VxPaper elevation={0} className="panel-card">
          <VxAlert severity="info" sx={{ mb: 2 }}>{t('pages.inventoryReports.valuation.standardCostNote')}</VxAlert>
          {valuationQuery.isLoading ? <ReportLoading /> : (
            <>
              <VxStack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                <VxTypography><strong>{t('pages.inventoryReports.valuation.totalEstimatedValue')}:</strong> {formatMoney(valuationQuery.data?.totalEstimatedValue ?? 0)}</VxTypography>
                <VxTypography><strong>{t('pages.inventoryReports.valuation.reconciledItems')}:</strong> {valuationQuery.data?.reconciledItemCount ?? 0}</VxTypography>
                <VxTypography><strong>{t('pages.inventoryReports.valuation.unreconciledItems')}:</strong> {valuationQuery.data?.unreconciledItemCount ?? 0}</VxTypography>
              </VxStack>
              <VxTableContainer>
                <VxTable size="small" sx={{ minWidth: 850 }}>
                  <VxTableHead><VxTableRow>
                    <VxTableCell>{t('pages.inventoryReports.valuation.columns.product')}</VxTableCell>
                    <VxTableCell>{t('pages.inventoryReports.valuation.columns.warehouse')}</VxTableCell>
                    <VxTableCell align="right">{t('pages.inventoryReports.valuation.columns.onHand')}</VxTableCell>
                    <VxTableCell align="right">{t('pages.inventoryReports.valuation.columns.standardCost')}</VxTableCell>
                    <VxTableCell align="right">{t('pages.inventoryReports.valuation.columns.value')}</VxTableCell>
                    <VxTableCell align="right">{t('pages.inventoryReports.valuation.columns.ledgerNet')}</VxTableCell>
                    <VxTableCell align="right">{t('pages.inventoryReports.valuation.columns.variance')}</VxTableCell>
                  </VxTableRow></VxTableHead>
                  <VxTableBody>
                    {(valuationQuery.data?.items ?? []).map((item) => (
                      <VxTableRow key={`${item.productId}-${item.warehouseId}`}>
                        <VxTableCell>{item.sku} · {item.productName}</VxTableCell>
                        <VxTableCell>{item.warehouseName}</VxTableCell>
                        <VxTableCell align="right">{formatQuantity(item.quantityOnHand)} {item.unitOfMeasure}</VxTableCell>
                        <VxTableCell align="right">{formatMoney(item.currentStandardCost)}</VxTableCell>
                        <VxTableCell align="right">{formatMoney(item.estimatedValue)}</VxTableCell>
                        <VxTableCell align="right">{formatQuantity(item.ledgerNetQuantity)}</VxTableCell>
                        <VxTableCell align="right" sx={{ color: item.balanceToLedgerVariance === 0 ? 'success.main' : 'warning.main' }}>{formatQuantity(item.balanceToLedgerVariance)}</VxTableCell>
                      </VxTableRow>
                    ))}
                    {!valuationQuery.data?.items.length ? <VxTableRow><VxTableCell colSpan={7}>{t('pages.inventoryReports.valuation.empty')}</VxTableCell></VxTableRow> : null}
                  </VxTableBody>
                </VxTable>
              </VxTableContainer>
            </>
          )}
        </VxPaper>
      ) : null}

      {tab === 1 ? (
        <VxPaper elevation={0} className="panel-card">
          <VxTypography color="text.secondary" sx={{ mb: 1 }}>{t('pages.inventoryReports.movementAudit.showing', { shown: movementQuery.data?.items.length ?? 0, total: movementQuery.data?.totalCount ?? 0 })}</VxTypography>
          {invalidDateRange ? <VxAlert severity="warning">{t('pages.inventoryReports.validation.dateOrder')}</VxAlert> : movementQuery.isLoading ? <ReportLoading /> : (
            <>
              <VxTableContainer>
                <VxTable size="small" sx={{ minWidth: 850 }}>
                  <VxTableHead><VxTableRow>
                    <VxTableCell>{t('pages.inventoryReports.movementAudit.columns.created')}</VxTableCell>
                    <VxTableCell>{t('pages.inventoryReports.movementAudit.columns.type')}</VxTableCell>
                    <VxTableCell>{t('pages.inventoryReports.movementAudit.columns.product')}</VxTableCell>
                    <VxTableCell>{t('pages.inventoryReports.movementAudit.columns.warehouse')}</VxTableCell>
                    <VxTableCell align="right">{t('pages.inventoryReports.movementAudit.columns.onHandDelta')}</VxTableCell>
                    <VxTableCell align="right">{t('pages.inventoryReports.movementAudit.columns.reservedDelta')}</VxTableCell>
                    <VxTableCell>{t('pages.inventoryReports.movementAudit.columns.reference')}</VxTableCell>
                  </VxTableRow></VxTableHead>
                  <VxTableBody>
                    {(movementQuery.data?.items ?? []).map((item) => (
                      <VxTableRow key={item.id}>
                        <VxTableCell>{formatDateTime(item.createdAtUtc)}</VxTableCell>
                        <VxTableCell>{t(`pages.inventoryReports.movementAudit.types.${item.movementType}`)}</VxTableCell>
                        <VxTableCell>{item.sku} · {item.productName}</VxTableCell>
                        <VxTableCell>{item.warehouseName}</VxTableCell>
                        <VxTableCell align="right">{formatQuantity(item.quantityOnHandDelta)}</VxTableCell>
                        <VxTableCell align="right">{formatQuantity(item.quantityReservedDelta)}</VxTableCell>
                        <VxTableCell>{item.sourceDocumentType ? `${t(`pages.inventoryReports.movementAudit.sourceTypes.${item.sourceDocumentType}`)}: ` : ''}{item.referenceNumber}</VxTableCell>
                      </VxTableRow>
                    ))}
                    {!movementQuery.data?.items.length ? <VxTableRow><VxTableCell colSpan={7}>{t('pages.inventoryReports.movementAudit.empty')}</VxTableCell></VxTableRow> : null}
                  </VxTableBody>
                </VxTable>
              </VxTableContainer>
              {movementQuery.data && movementQuery.data.totalCount > pageSize ? (
                <VxStack direction="row" sx={{ justifyContent: 'flex-end', mt: 2 }}>
                  <VxPagination
                    page={page + 1}
                    count={Math.max(1, Math.ceil(movementQuery.data.totalCount / pageSize))}
                    onChange={(_, nextPage) => setPage(nextPage - 1)}
                    size="small"
                    color="primary"
                  />
                </VxStack>
              ) : null}
            </>
          )}
        </VxPaper>
      ) : null}

      {tab === 2 ? (
        <VxPaper elevation={0} className="panel-card">
          <VxTypography color="text.secondary" sx={{ mb: 2 }}>{t('pages.inventoryReports.reorder.summary', { count: reorderQuery.data?.recommendationCount ?? 0 })}</VxTypography>
          {reorderQuery.isLoading ? <ReportLoading /> : (
            <VxTableContainer>
              <VxTable size="small" sx={{ minWidth: 620 }}>
                <VxTableHead><VxTableRow>
                  <VxTableCell>{t('pages.inventoryReports.reorder.columns.product')}</VxTableCell>
                  <VxTableCell align="right">{t('pages.inventoryReports.reorder.columns.available')}</VxTableCell>
                  <VxTableCell align="right">{t('pages.inventoryReports.reorder.columns.reorderLevel')}</VxTableCell>
                  <VxTableCell align="right">{t('pages.inventoryReports.reorder.columns.suggested')}</VxTableCell>
                </VxTableRow></VxTableHead>
                <VxTableBody>
                  {(reorderQuery.data?.items ?? []).map((item) => (
                    <VxTableRow key={item.productId}>
                      <VxTableCell>{item.sku} · {item.productName}</VxTableCell>
                      <VxTableCell align="right">{formatQuantity(item.activeWarehouseAvailable)} {item.unitOfMeasure}</VxTableCell>
                      <VxTableCell align="right">{formatQuantity(item.reorderLevel)} {item.unitOfMeasure}</VxTableCell>
                      <VxTableCell align="right">{formatQuantity(item.suggestedReorderQuantity)} {item.unitOfMeasure}</VxTableCell>
                    </VxTableRow>
                  ))}
                  {!reorderQuery.data?.items.length ? <VxTableRow><VxTableCell colSpan={4}>{t('pages.inventoryReports.reorder.empty')}</VxTableCell></VxTableRow> : null}
                </VxTableBody>
              </VxTable>
            </VxTableContainer>
          )}
        </VxPaper>
      ) : null}
    </VxStack>
  )
}

function ReportLoading() {
  return <VxBox sx={{ display: 'grid', placeItems: 'center', minHeight: 120 }}><VxCircularProgress size={24} /></VxBox>
}