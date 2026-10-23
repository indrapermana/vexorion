import { DeleteSweepRoundedIcon, HistoryRoundedIcon, LocalShippingRoundedIcon, PrintRoundedIcon, ReceiptLongRoundedIcon } from '@vexorion/ui'
import { VxBox, VxButton, VxChip, VxCollapse, VxConfirmActionButton, VxDivider, VxIconButton, VxPaper, VxStack, VxTable, VxTableBody, VxTableCell, VxTableHead, VxTableRow, VxTooltip, VxTypography } from '@vexorion/ui'
import { useState } from 'react'
import { useI18n } from '../app/I18nContext'
import { useTransactionHistory } from '../app/transactionHistoryStore'
import { ReceiptModal, type ReceiptData } from './pos/ReceiptModal'

export function TransactionHistoryPanel() {
  const { transactions, clear } = useTransactionHistory()
  const [open, setOpen] = useState(false)
  const { t } = useI18n()
  const [reprintData, setReprintData] = useState<ReceiptData | null>(null)

  if (transactions.length === 0 && !open) {
    return null
  }

  return (
    <VxPaper sx={{ p: 2 }}>
      <VxStack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <VxStack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <HistoryRoundedIcon color="action" fontSize="small" />
          <VxTypography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {t('history.title', { count: transactions.length })}
          </VxTypography>
        </VxStack>
        <VxStack direction="row" spacing={1}>
          {transactions.length > 0 ? (
            <VxTooltip title={t('history.clearTooltip')}>
              <VxConfirmActionButton
                title={t('history.clear')}
                targetName={t('history.title')}
                consequence={t('history.clearConsequence')}
                confirmLabel={t('history.clear')}
                onConfirm={clear}
                buttonProps={{ size: 'small', startIcon: <DeleteSweepRoundedIcon />, color: 'inherit' }}
              >{t('history.clear')}</VxConfirmActionButton>
            </VxTooltip>
          ) : null}
          <VxButton size="small" onClick={() => setOpen((previous) => !previous)}>
            {open ? t('common.collapse') : t('common.show')}
          </VxButton>
        </VxStack>
      </VxStack>

      <VxCollapse in={open} timeout="auto">
        <VxDivider sx={{ my: 1 }} />
        {transactions.length === 0 ? (
          <VxBox sx={{ py: 2, textAlign: 'center' }}>
            <VxTypography variant="body2" color="text.secondary">{t('history.empty')}</VxTypography>
          </VxBox>
        ) : (
          <VxTable size="small">
            <VxTableHead>
              <VxTableRow>
                <VxTableCell>{t('history.time')}</VxTableCell>
                <VxTableCell>{t('history.customer')}</VxTableCell>
                <VxTableCell align="right">{t('history.total')}</VxTableCell>
                <VxTableCell align="right">{t('history.paid')}</VxTableCell>
                <VxTableCell>{t('history.method')}</VxTableCell>
                <VxTableCell align="right">{t('history.lines')}</VxTableCell>
                <VxTableCell>{t('history.flags')}</VxTableCell>
                <VxTableCell>{t('history.invoice')}</VxTableCell>                <VxTableCell />              </VxTableRow>
            </VxTableHead>
            <VxTableBody>
              {transactions.map((transaction) => (
                <VxTableRow key={transaction.id} hover>
                  <VxTableCell>
                    <VxTypography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
                      {new Date(transaction.completedAt).toLocaleTimeString()}
                    </VxTypography>
                  </VxTableCell>
                  <VxTableCell>
                    <VxTypography variant="body2">{transaction.customerLabel}</VxTypography>
                  </VxTableCell>
                  <VxTableCell align="right">
                    <VxTypography variant="body2" sx={{ fontWeight: 600 }}>
                      {transaction.grandTotal.toFixed(2)}
                    </VxTypography>
                  </VxTableCell>
                  <VxTableCell align="right">
                    <VxTypography variant="body2">{transaction.paymentAmount.toFixed(2)}</VxTypography>
                  </VxTableCell>
                  <VxTableCell>
                    <VxChip size="small" label={transaction.paymentMethod} />
                  </VxTableCell>
                  <VxTableCell align="right">
                    <VxTypography variant="body2">{transaction.lineCount}</VxTypography>
                  </VxTableCell>
                  <VxTableCell>
                    <VxStack direction="row" spacing={0.5}>
                      {transaction.isDelivery ? (
                        <VxTooltip title={t('history.delivery')}>
                          <LocalShippingRoundedIcon fontSize="small" color="primary" />
                        </VxTooltip>
                      ) : null}
                      {transaction.paymentId ? (
                        <VxTooltip title={t('history.paymentRecorded')}>
                          <ReceiptLongRoundedIcon fontSize="small" color="success" />
                        </VxTooltip>
                      ) : null}
                    </VxStack>
                  </VxTableCell>
                  <VxTableCell>
                    <VxTypography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      {transaction.invoiceId.slice(0, 8)}…
                    </VxTypography>
                  </VxTableCell>
                  <VxTableCell>
                    <VxTooltip title={t('receipt.reprint')}>
                      <VxIconButton
                        size="small"
                        aria-label={t('receipt.reprint')}
                        onClick={() =>
                          setReprintData({
                            completedAt: transaction.completedAt,
                            customerLabel: transaction.customerLabel,
                            currencyCode: transaction.currencyCode ?? '',
                            lines: transaction.lines ?? [],
                            paymentAmount: transaction.paymentAmount,
                            paymentMethod: transaction.paymentMethod,
                            isDelivery: transaction.isDelivery,
                            orderId: transaction.orderId,
                            invoiceId: transaction.invoiceId,
                            shipmentId: transaction.shipmentId,
                            paymentId: transaction.paymentId,
                          })
                        }
                      >
                        <PrintRoundedIcon fontSize="small" />
                      </VxIconButton>
                    </VxTooltip>
                  </VxTableCell>
                </VxTableRow>
              ))}
            </VxTableBody>
          </VxTable>
        )}
      </VxCollapse>

      <ReceiptModal
        open={reprintData !== null}
        data={reprintData}
        onClose={() => setReprintData(null)}
      />
    </VxPaper>
  )
}
