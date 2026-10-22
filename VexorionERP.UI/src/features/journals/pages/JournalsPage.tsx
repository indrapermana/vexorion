import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { VxAlert, VxBox, VxConfirmActionButton, VxDivider, VxMenuItem, VxPaper, VxStack, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../app/AuthContext'
import { Permissions } from '../../../app/authorization'
import PermissionReadOnlyAlert from '../../../components/PermissionReadOnlyAlert'
import { PageBody, PageFeedback, PageHeader, PageLoadingState } from '../../../components/PagePrimitives'
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
  const { t } = useTranslation()
  return <PageLoadingState label={t('common.labels.loading')} />
}

export default function JournalsPage() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const canManage = user?.permissions.includes(Permissions.billing.manage) ?? false

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
      const [journalRows, accountRows] = await Promise.all([
        getJournals(),
        canManage ? getAccounts() : Promise.resolve([]),
      ])
      setJournals(journalRows)
      setAccounts(accountRows)
    } catch (loadError) {
      if (loadError instanceof ApiError) setError(loadError.message)
      else setError('Unable to load journals.')
    } finally {
      setIsLoading(false)
    }
  }, [canManage, isAuthenticated])

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
    if (!canManage) return
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
    if (!canManage) return
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
    if (!canManage) return
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
    return <VxAlert severity="info">{t('pages.journals.signInRequired')}</VxAlert>
  }

  return (
    <VxStack spacing={3}>
      <PageHeader title={t('pages.journals.title')} description={t('pages.journals.description')} />

      <PageFeedback error={error} success={feedback} onRetry={error ? () => void loadData() : undefined} />
      {!canManage ? <PermissionReadOnlyAlert requiredPermission={Permissions.billing.manage} /> : null}

      {canManage ? <VxPaper elevation={0} className="panel-card">
        <VxStack spacing={2.5}>
          <VxTypography variant="h6">Post sales invoice</VxTypography>
          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <VxTextField fullWidth label="Sales invoice ID" value={salesInvoiceId} onChange={(e) => setSalesInvoiceId(e.target.value)} />
            <VxTextField fullWidth type="date" label="Posting date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          </VxStack>
          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <VxTextField select fullWidth label="AR account" value={arAccountId} onChange={(e) => setArAccountId(e.target.value)}>
              {accountOptions.map((option) => <VxMenuItem key={option.value} value={option.value}>{option.label}</VxMenuItem>)}
            </VxTextField>
            <VxTextField select fullWidth label="Revenue account" value={revenueAccountId} onChange={(e) => setRevenueAccountId(e.target.value)}>
              {accountOptions.map((option) => <VxMenuItem key={option.value} value={option.value}>{option.label}</VxMenuItem>)}
            </VxTextField>
            <VxTextField select fullWidth label="Tax liability (optional)" value={salesTaxAccountId} onChange={(e) => setSalesTaxAccountId(e.target.value)}>
              <VxMenuItem value="">None</VxMenuItem>
              {accountOptions.map((option) => <VxMenuItem key={option.value} value={option.value}>{option.label}</VxMenuItem>)}
            </VxTextField>
          </VxStack>
          <VxConfirmActionButton
            title="Post sales invoice"
            targetName={salesInvoiceId || 'Sales invoice'}
            consequence={`Posting creates accounting entries dated ${postingDate}. Posted entries must be corrected through a reversal.`}
            confirmLabel="Post invoice"
            pendingLabel="Posting..."
            onConfirm={handlePostSalesInvoice}
            buttonProps={{ variant: 'contained', disabled: !salesInvoiceId || !arAccountId || !revenueAccountId }}
          >Post sales invoice</VxConfirmActionButton>

          <VxDivider />

          <VxTypography variant="h6">Post purchase invoice</VxTypography>
          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <VxTextField fullWidth label="Purchase invoice ID" value={purchaseInvoiceId} onChange={(e) => setPurchaseInvoiceId(e.target.value)} />
            <VxTextField fullWidth type="date" label="Posting date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          </VxStack>
          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <VxTextField select fullWidth label="AP account" value={apAccountId} onChange={(e) => setApAccountId(e.target.value)}>
              {accountOptions.map((option) => <VxMenuItem key={option.value} value={option.value}>{option.label}</VxMenuItem>)}
            </VxTextField>
            <VxTextField select fullWidth label="Expense account" value={expenseAccountId} onChange={(e) => setExpenseAccountId(e.target.value)}>
              {accountOptions.map((option) => <VxMenuItem key={option.value} value={option.value}>{option.label}</VxMenuItem>)}
            </VxTextField>
            <VxTextField select fullWidth label="Tax receivable (optional)" value={purchaseTaxAccountId} onChange={(e) => setPurchaseTaxAccountId(e.target.value)}>
              <VxMenuItem value="">None</VxMenuItem>
              {accountOptions.map((option) => <VxMenuItem key={option.value} value={option.value}>{option.label}</VxMenuItem>)}
            </VxTextField>
          </VxStack>
          <VxConfirmActionButton
            title="Post purchase invoice"
            targetName={purchaseInvoiceId || 'Purchase invoice'}
            consequence={`Posting creates accounting entries dated ${postingDate}. Posted entries must be corrected through a reversal.`}
            confirmLabel="Post invoice"
            pendingLabel="Posting..."
            onConfirm={handlePostPurchaseInvoice}
            buttonProps={{ variant: 'contained', disabled: !purchaseInvoiceId || !apAccountId || !expenseAccountId }}
          >Post purchase invoice</VxConfirmActionButton>

          <VxDivider />

          <VxTypography variant="h6">Reverse journal</VxTypography>
          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <VxTextField fullWidth label="Journal entry ID" value={reverseJournalId} onChange={(e) => setReverseJournalId(e.target.value)} />
            <VxTextField fullWidth type="date" label="Reversal date" value={reversalDate} onChange={(e) => setReversalDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          </VxStack>
          <VxConfirmActionButton
            title="Reverse journal"
            targetName={reverseJournalId || 'Journal entry'}
            consequence={`This creates a reversing entry dated ${reversalDate}. The original journal remains in the audit history.`}
            confirmLabel="Reverse journal"
            pendingLabel="Reversing..."
            onConfirm={handleReverseJournal}
            buttonProps={{ variant: 'outlined', color: 'error', disabled: !reverseJournalId }}
          >Reverse journal</VxConfirmActionButton>
        </VxStack>
      </VxPaper> : null}

      <PageBody>
        <Suspense fallback={<JournalSurfaceFallback />}>
          <JournalDataGrid rows={journals} isLoading={isLoading} onOpen={(journalId) => void handleOpenJournal(journalId)} />
        </Suspense>
      </PageBody>

      {selectedJournal ? (
        <VxPaper elevation={0} className="panel-card">
          <VxTypography variant="h6" sx={{ mb: 2 }}>Journal {selectedJournal.journalNumber}</VxTypography>
          <VxTypography color="text.secondary" sx={{ mb: 1 }}>Source: {selectedJournal.sourceDocumentType} / {selectedJournal.sourceDocumentId ?? 'N/A'}</VxTypography>
          <VxTypography color="text.secondary" sx={{ mb: 2 }}>Debit {selectedJournal.totalDebit.toFixed(2)} / Credit {selectedJournal.totalCredit.toFixed(2)}</VxTypography>
          <VxStack spacing={1}>
            {selectedJournal.lines.map((line) => (
              <VxBox key={line.id} sx={{ border: '1px solid rgba(15, 23, 42, 0.08)', borderRadius: 2, px: 2, py: 1.25 }}>
                <VxTypography sx={{ fontWeight: 700 }}>{line.accountCode} - {line.accountName}</VxTypography>
                <VxTypography variant="body2" color="text.secondary">Debit {line.debitAmount.toFixed(2)} / Credit {line.creditAmount.toFixed(2)}</VxTypography>
              </VxBox>
            ))}
          </VxStack>
        </VxPaper>
      ) : null}
    </VxStack>
  )
}
