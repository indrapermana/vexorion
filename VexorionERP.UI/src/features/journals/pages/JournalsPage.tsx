import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Divider, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import {
  ApiError,
  getAccounts,
  getJournal,
  getJournals,
  postPurchaseInvoice,
  postSalesInvoice,
  reverseJournal,
} from '../../../lib/api'
import type { AccountListItemResponse, JournalEntryDetailsResponse, JournalEntryListItemResponse } from '../../../types/api'
import { getAccountTypeLabel } from '../../../types/ui'

const JournalDataGrid = lazy(() => import('../components/JournalDataGrid'))

function JournalSurfaceFallback() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
      <CircularProgress size={28} />
    </Box>
  )
}

export default function JournalsPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()

  const [journals, setJournals] = useState<JournalEntryListItemResponse[]>([])
  const [accounts, setAccounts] = useState<AccountListItemResponse[]>([])
  const [selectedJournal, setSelectedJournal] = useState<JournalEntryDetailsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const [salesInvoiceId, setSalesInvoiceId] = useState('')
  const [purchaseInvoiceId, setPurchaseInvoiceId] = useState('')
  const [postingDate, setPostingDate] = useState(new Date().toISOString().slice(0, 10))
  const [reversalDate, setReversalDate] = useState(new Date().toISOString().slice(0, 10))

  const [arAccountId, setArAccountId] = useState('')
  const [revenueAccountId, setRevenueAccountId] = useState('')
  const [salesTaxAccountId, setSalesTaxAccountId] = useState('')

  const [apAccountId, setApAccountId] = useState('')
  const [expenseAccountId, setExpenseAccountId] = useState('')
  const [purchaseTaxAccountId, setPurchaseTaxAccountId] = useState('')

  const [reverseJournalId, setReverseJournalId] = useState('')

  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setJournals([])
      setAccounts([])
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const [journalRows, accountRows] = await Promise.all([getJournals(), getAccounts()])
      setJournals(journalRows)
      setAccounts(accountRows)
    } catch (loadError) {
      if (loadError instanceof ApiError) setError(loadError.message)
      else setError('Unable to load journals.')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (selectedJournal && !journals.some((x) => x.id === selectedJournal.id)) {
      setSelectedJournal(null)
    }
  }, [journals, selectedJournal])

  const accountOptions = useMemo(
    () => accounts
      .filter((account) => account.isActive)
      .map((account) => ({ value: account.id, label: `${account.code} - ${account.name} (${getAccountTypeLabel(account.accountType)})` })),
    [accounts],
  )

  const handleOpenJournal = async (journalId: string) => {
    setError(null)
    try {
      setSelectedJournal(await getJournal(journalId))
    } catch (openError) {
      if (openError instanceof ApiError) setError(openError.message)
      else setError('Unable to open journal details.')
    }
  }

  const handlePostSalesInvoice = async () => {
    setError(null)
    setFeedback(null)
    try {
      const journal = await postSalesInvoice(salesInvoiceId, {
        receivableAccountId: arAccountId,
        revenueAccountId,
        taxLiabilityAccountId: salesTaxAccountId || null,
        postingDate,
      })
      setFeedback(`Sales invoice posted to journal ${journal.journalNumber}.`)
      setSalesInvoiceId('')
      await loadData()
      setSelectedJournal(journal)
    } catch (postError) {
      if (postError instanceof ApiError) setError(postError.message)
      else setError('Unable to post sales invoice.')
    }
  }

  const handlePostPurchaseInvoice = async () => {
    setError(null)
    setFeedback(null)
    try {
      const journal = await postPurchaseInvoice(purchaseInvoiceId, {
        payableAccountId: apAccountId,
        expenseAccountId,
        taxReceivableAccountId: purchaseTaxAccountId || null,
        postingDate,
      })
      setFeedback(`Purchase invoice posted to journal ${journal.journalNumber}.`)
      setPurchaseInvoiceId('')
      await loadData()
      setSelectedJournal(journal)
    } catch (postError) {
      if (postError instanceof ApiError) setError(postError.message)
      else setError('Unable to post purchase invoice.')
    }
  }

  const handleReverseJournal = async () => {
    setError(null)
    setFeedback(null)
    try {
      const journal = await reverseJournal(reverseJournalId, { reversalDate })
      setFeedback(`Journal reversed with entry ${journal.journalNumber}.`)
      setReverseJournalId('')
      await loadData()
      setSelectedJournal(journal)
    } catch (reverseError) {
      if (reverseError instanceof ApiError) setError(reverseError.message)
      else setError('Unable to reverse journal.')
    }
  }

  if (!isAuthenticated) {
    return <Alert severity="info">{t('pages.journals.signInRequired')}</Alert>
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Typography variant="h4" sx={{ mb: 1 }}>{t('pages.journals.title')}</Typography>
        <Typography color="text.secondary">{t('pages.journals.description')}</Typography>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {feedback ? <Alert severity="success">{feedback}</Alert> : null}

      <Paper elevation={0} className="panel-card">
        <Stack spacing={2.5}>
          <Typography variant="h6">Post sales invoice</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField fullWidth label="Sales invoice ID" value={salesInvoiceId} onChange={(e) => setSalesInvoiceId(e.target.value)} />
            <TextField fullWidth type="date" label="Posting date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField select fullWidth label="AR account" value={arAccountId} onChange={(e) => setArAccountId(e.target.value)}>
              {accountOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
            </TextField>
            <TextField select fullWidth label="Revenue account" value={revenueAccountId} onChange={(e) => setRevenueAccountId(e.target.value)}>
              {accountOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
            </TextField>
            <TextField select fullWidth label="Tax liability (optional)" value={salesTaxAccountId} onChange={(e) => setSalesTaxAccountId(e.target.value)}>
              <MenuItem value="">None</MenuItem>
              {accountOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
            </TextField>
          </Stack>
          <Button variant="contained" onClick={() => void handlePostSalesInvoice()} disabled={!salesInvoiceId || !arAccountId || !revenueAccountId}>Post sales invoice</Button>

          <Divider />

          <Typography variant="h6">Post purchase invoice</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField fullWidth label="Purchase invoice ID" value={purchaseInvoiceId} onChange={(e) => setPurchaseInvoiceId(e.target.value)} />
            <TextField fullWidth type="date" label="Posting date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField select fullWidth label="AP account" value={apAccountId} onChange={(e) => setApAccountId(e.target.value)}>
              {accountOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
            </TextField>
            <TextField select fullWidth label="Expense account" value={expenseAccountId} onChange={(e) => setExpenseAccountId(e.target.value)}>
              {accountOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
            </TextField>
            <TextField select fullWidth label="Tax receivable (optional)" value={purchaseTaxAccountId} onChange={(e) => setPurchaseTaxAccountId(e.target.value)}>
              <MenuItem value="">None</MenuItem>
              {accountOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
            </TextField>
          </Stack>
          <Button variant="contained" onClick={() => void handlePostPurchaseInvoice()} disabled={!purchaseInvoiceId || !apAccountId || !expenseAccountId}>Post purchase invoice</Button>

          <Divider />

          <Typography variant="h6">Reverse journal</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField fullWidth label="Journal entry ID" value={reverseJournalId} onChange={(e) => setReverseJournalId(e.target.value)} />
            <TextField fullWidth type="date" label="Reversal date" value={reversalDate} onChange={(e) => setReversalDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          </Stack>
          <Button variant="outlined" onClick={() => void handleReverseJournal()} disabled={!reverseJournalId}>Reverse journal</Button>
        </Stack>
      </Paper>

      <Paper elevation={0} className="panel-card products-grid-panel">
        <Suspense fallback={<JournalSurfaceFallback />}>
          <JournalDataGrid rows={journals} isLoading={isLoading} onOpen={(journalId) => void handleOpenJournal(journalId)} />
        </Suspense>
      </Paper>

      {selectedJournal ? (
        <Paper elevation={0} className="panel-card">
          <Typography variant="h6" sx={{ mb: 2 }}>Journal {selectedJournal.journalNumber}</Typography>
          <Typography color="text.secondary" sx={{ mb: 1 }}>Source: {selectedJournal.sourceDocumentType} / {selectedJournal.sourceDocumentId ?? 'N/A'}</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>Debit {selectedJournal.totalDebit.toFixed(2)} / Credit {selectedJournal.totalCredit.toFixed(2)}</Typography>
          <Stack spacing={1}>
            {selectedJournal.lines.map((line) => (
              <Box key={line.id} sx={{ border: '1px solid rgba(15, 23, 42, 0.08)', borderRadius: 2, px: 2, py: 1.25 }}>
                <Typography sx={{ fontWeight: 700 }}>{line.accountCode} - {line.accountName}</Typography>
                <Typography variant="body2" color="text.secondary">Debit {line.debitAmount.toFixed(2)} / Credit {line.creditAmount.toFixed(2)}</Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  )
}
