import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded'
import PrintRoundedIcon from '@mui/icons-material/PrintRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import {
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
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
    <Paper sx={{ p: 2 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <HistoryRoundedIcon color="action" fontSize="small" />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {t('history.title', { count: transactions.length })}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          {transactions.length > 0 ? (
            <Tooltip title={t('history.clearTooltip')}>
              <Button size="small" startIcon={<DeleteSweepRoundedIcon />} color="inherit" onClick={clear}>
                {t('history.clear')}
              </Button>
            </Tooltip>
          ) : null}
          <Button size="small" onClick={() => setOpen((previous) => !previous)}>
            {open ? t('common.collapse') : t('common.show')}
          </Button>
        </Stack>
      </Stack>

      <Collapse in={open} timeout="auto">
        <Divider sx={{ my: 1 }} />
        {transactions.length === 0 ? (
          <Box sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">{t('history.empty')}</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('history.time')}</TableCell>
                <TableCell>{t('history.customer')}</TableCell>
                <TableCell align="right">{t('history.total')}</TableCell>
                <TableCell align="right">{t('history.paid')}</TableCell>
                <TableCell>{t('history.method')}</TableCell>
                <TableCell align="right">{t('history.lines')}</TableCell>
                <TableCell>{t('history.flags')}</TableCell>
                <TableCell>{t('history.invoice')}</TableCell>                <TableCell />              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id} hover>
                  <TableCell>
                    <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
                      {new Date(transaction.completedAt).toLocaleTimeString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{transaction.customerLabel}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {transaction.grandTotal.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{transaction.paymentAmount.toFixed(2)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={transaction.paymentMethod} />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{transaction.lineCount}</Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {transaction.isDelivery ? (
                        <Tooltip title={t('history.delivery')}>
                          <LocalShippingRoundedIcon fontSize="small" color="primary" />
                        </Tooltip>
                      ) : null}
                      {transaction.paymentId ? (
                        <Tooltip title={t('history.paymentRecorded')}>
                          <ReceiptLongRoundedIcon fontSize="small" color="success" />
                        </Tooltip>
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      {transaction.invoiceId.slice(0, 8)}…
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={t('receipt.reprint')}>
                      <IconButton
                        size="small"
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
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Collapse>

      <ReceiptModal
        open={reprintData !== null}
        data={reprintData}
        onClose={() => setReprintData(null)}
      />
    </Paper>
  )
}
