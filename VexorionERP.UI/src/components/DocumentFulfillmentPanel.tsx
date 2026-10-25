import { useCallback, useEffect, useState } from 'react'
import { VxAlert, VxPaper, VxTable, VxTableBody, VxTableCell, VxTableHead, VxTableRow, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { ApiError, getPurchaseReceiptsForOrder, getSalesShipmentsForOrder } from '../lib/api'
import type { PurchaseReceiptListItemResponse, SalesShipmentListItemResponse } from '../types/api'

type DocumentFulfillmentPanelProps = {
  kind: 'shipment' | 'receipt'
  sourceOrderId: string | null
}

type FulfillmentRecord = {
  id: string
  number: string
  date: string
  status: number
  lineCount: number
}

export default function DocumentFulfillmentPanel({ kind, sourceOrderId }: DocumentFulfillmentPanelProps) {
  const { t } = useTranslation()
  const [records, setRecords] = useState<FulfillmentRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadRecords = useCallback(async () => {
    if (!sourceOrderId) {
      setRecords((currentRecords) => currentRecords.length > 0 ? [] : currentRecords)
      return
    }

    setRecords([])
    setIsLoading(true)
    setError(null)
    try {
      const relatedRecords: FulfillmentRecord[] = kind === 'shipment'
        ? (await getSalesShipmentsForOrder(sourceOrderId)).map((item: SalesShipmentListItemResponse) => ({
          id: item.id,
          number: item.shipmentNumber,
          date: item.shipmentDate,
          status: item.status,
          lineCount: item.lineCount,
        }))
        : (await getPurchaseReceiptsForOrder(sourceOrderId)).map((item: PurchaseReceiptListItemResponse) => ({
          id: item.id,
          number: item.receiptNumber,
          date: item.receiptDate,
          status: item.status,
          lineCount: item.lineCount,
        }))
      setRecords(relatedRecords)
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : t('orderWorkflow.review.fulfillmentLoadError'))
    } finally {
      setIsLoading(false)
    }
  }, [kind, sourceOrderId, t])

  useEffect(() => {
    void loadRecords()
  }, [loadRecords])

  if (!sourceOrderId) return null

  const documentType = kind === 'shipment' ? 'shipment' : 'receipt'

  return (
    <VxPaper elevation={0} className="panel-card">
      <VxTypography component="h2" variant="h6" sx={{ mb: 1.5 }}>{t(`orderWorkflow.review.${kind === 'shipment' ? 'shipments' : 'receipts'}`)}</VxTypography>
      {error ? <VxAlert severity="error" sx={{ mb: 1.5 }}>{error}</VxAlert> : null}
      {isLoading ? <VxTypography color="text.secondary">{t('orderWorkflow.review.loading')}</VxTypography> : null}
      {!isLoading && !error && records.length === 0 ? <VxTypography color="text.secondary">{t(`orderWorkflow.review.no${kind === 'shipment' ? 'Shipments' : 'Receipts'}`)}</VxTypography> : null}
      {records.length > 0 ? (
        <VxTable size="small">
          <VxTableHead>
            <VxTableRow>
              <VxTableCell>{t('orderWorkflow.review.documentNumber')}</VxTableCell>
              <VxTableCell>{t('orderWorkflow.review.documentDate')}</VxTableCell>
              <VxTableCell>{t('orderWorkflow.review.status')}</VxTableCell>
              <VxTableCell align="right">{t('orderWorkflow.review.lineCount')}</VxTableCell>
            </VxTableRow>
          </VxTableHead>
          <VxTableBody>
            {records.map((record) => (
              <VxTableRow key={record.id}>
                <VxTableCell>{record.number}</VxTableCell>
                <VxTableCell>{record.date}</VxTableCell>
                <VxTableCell>{t(`orderWorkflow.lifecycle.${documentType}StatusLabels.${record.status}`, { defaultValue: t('orderWorkflow.lifecycle.unknown') })}</VxTableCell>
                <VxTableCell align="right">{record.lineCount}</VxTableCell>
              </VxTableRow>
            ))}
          </VxTableBody>
        </VxTable>
      ) : null}
    </VxPaper>
  )
}