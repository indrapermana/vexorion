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
      else setError(t('pages.journals.errors.load'))
    } finally {
      setIsLoading(false)
    }
  }, [canManage, isAuthenticated, t])

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
      .map((account) => ({ value: account.id, label: `${account.code} - ${account.name} (${t(`pages.journals.accountTypes.${account.accountType}`)})` })),
    [accounts, t],
  )

  const handleOpenJournal = async (journalId: string) => {
    setError(null)
    try {
      setSelectedJournal(await getJournal(journalId))
    } catch (openError) {
      if (openError instanceof ApiError) setError(openError.message)
      else setError(t('pages.journals.errors.open'))
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
      setFeedback(t('pages.journals.feedback.postedSales', { journalNumber: journal.journalNumber }))
      setSalesInvoiceId('')
      await loadData()
      setSelectedJournal(journal)
    } catch (postError) {
      if (postError instanceof ApiError) setError(postError.message)
      else setError(t('pages.journals.errors.postSales'))
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
      setFeedback(t('pages.journals.feedback.postedPurchase', { journalNumber: journal.journalNumber }))
      setPurchaseInvoiceId('')
      await loadData()
      setSelectedJournal(journal)
    } catch (postError) {
      if (postError instanceof ApiError) setError(postError.message)
      else setError(t('pages.journals.errors.postPurchase'))
    }
  }

  const handleReverseJournal = async () => {
    if (!canManage) return
    setError(null)
    setFeedback(null)
    try {
      const journal = await reverseJournal(reverseJournalId, { reversalDate })
      setFeedback(t('pages.journals.feedback.reversed', { journalNumber: journal.journalNumber }))
      setReverseJournalId('')
      await loadData()
      setSelectedJournal(journal)
    } catch (reverseError) {
      if (reverseError instanceof ApiError) setError(reverseError.message)
      else setError(t('pages.journals.errors.reverse'))
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
          <VxTypography component="h2" variant="h6">{t('pages.journals.actions.postSales')}</VxTypography>
          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <VxTextField fullWidth label={t('pages.journals.fields.salesInvoiceId')} value={salesInvoiceId} onChange={(e) => setSalesInvoiceId(e.target.value)} />
            <VxTextField fullWidth type="date" label={t('pages.journals.fields.postingDate')} value={postingDate} onChange={(e) => setPostingDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          </VxStack>
          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <VxTextField select fullWidth label={t('pages.journals.fields.arAccount')} value={arAccountId} onChange={(e) => setArAccountId(e.target.value)}>
              {accountOptions.map((option) => <VxMenuItem key={option.value} value={option.value}>{option.label}</VxMenuItem>)}
            </VxTextField>
            <VxTextField select fullWidth label={t('pages.journals.fields.revenueAccount')} value={revenueAccountId} onChange={(e) => setRevenueAccountId(e.target.value)}>
              {accountOptions.map((option) => <VxMenuItem key={option.value} value={option.value}>{option.label}</VxMenuItem>)}
            </VxTextField>
            <VxTextField select fullWidth label={t('pages.journals.fields.salesTaxAccount')} value={salesTaxAccountId} onChange={(e) => setSalesTaxAccountId(e.target.value)}>
              <VxMenuItem value="">{t('common.no')}</VxMenuItem>
              {accountOptions.map((option) => <VxMenuItem key={option.value} value={option.value}>{option.label}</VxMenuItem>)}
            </VxTextField>
          </VxStack>
          <VxConfirmActionButton
            title={t('pages.journals.actions.postSales')}
            targetName={salesInvoiceId || t('pages.journals.actions.postSales')}
            consequence={t('pages.journals.confirmation.posting', { date: postingDate })}
            confirmLabel={t('pages.journals.actions.confirmPost')}
            pendingLabel={t('pages.journals.actions.confirmingPost')}
            onConfirm={handlePostSalesInvoice}
            buttonProps={{ variant: 'contained', disabled: !salesInvoiceId || !arAccountId || !revenueAccountId }}
          >{t('pages.journals.actions.postSales')}</VxConfirmActionButton>

          <VxDivider />

          <VxTypography component="h2" variant="h6">{t('pages.journals.actions.postPurchase')}</VxTypography>
          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <VxTextField fullWidth label={t('pages.journals.fields.purchaseInvoiceId')} value={purchaseInvoiceId} onChange={(e) => setPurchaseInvoiceId(e.target.value)} />
            <VxTextField fullWidth type="date" label={t('pages.journals.fields.postingDate')} value={postingDate} onChange={(e) => setPostingDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          </VxStack>
          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <VxTextField select fullWidth label={t('pages.journals.fields.apAccount')} value={apAccountId} onChange={(e) => setApAccountId(e.target.value)}>
              {accountOptions.map((option) => <VxMenuItem key={option.value} value={option.value}>{option.label}</VxMenuItem>)}
            </VxTextField>
            <VxTextField select fullWidth label={t('pages.journals.fields.expenseAccount')} value={expenseAccountId} onChange={(e) => setExpenseAccountId(e.target.value)}>
              {accountOptions.map((option) => <VxMenuItem key={option.value} value={option.value}>{option.label}</VxMenuItem>)}
            </VxTextField>
            <VxTextField select fullWidth label={t('pages.journals.fields.purchaseTaxAccount')} value={purchaseTaxAccountId} onChange={(e) => setPurchaseTaxAccountId(e.target.value)}>
              <VxMenuItem value="">{t('common.no')}</VxMenuItem>
              {accountOptions.map((option) => <VxMenuItem key={option.value} value={option.value}>{option.label}</VxMenuItem>)}
            </VxTextField>
          </VxStack>
          <VxConfirmActionButton
            title={t('pages.journals.actions.postPurchase')}
            targetName={purchaseInvoiceId || t('pages.journals.actions.postPurchase')}
            consequence={t('pages.journals.confirmation.posting', { date: postingDate })}
            confirmLabel={t('pages.journals.actions.confirmPost')}
            pendingLabel={t('pages.journals.actions.confirmingPost')}
            onConfirm={handlePostPurchaseInvoice}
            buttonProps={{ variant: 'contained', disabled: !purchaseInvoiceId || !apAccountId || !expenseAccountId }}
          >{t('pages.journals.actions.postPurchase')}</VxConfirmActionButton>

          <VxDivider />

          <VxTypography component="h2" variant="h6">{t('pages.journals.actions.reverseJournal')}</VxTypography>
          <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <VxTextField fullWidth label={t('pages.journals.fields.journalEntryId')} value={reverseJournalId} onChange={(e) => setReverseJournalId(e.target.value)} />
            <VxTextField fullWidth type="date" label={t('pages.journals.fields.reversalDate')} value={reversalDate} onChange={(e) => setReversalDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          </VxStack>
          <VxConfirmActionButton
            title={t('pages.journals.actions.reverseJournal')}
            targetName={reverseJournalId || t('pages.journals.actions.reverseJournal')}
            consequence={t('pages.journals.confirmation.reversal', { date: reversalDate })}
            confirmLabel={t('pages.journals.actions.confirmReverse')}
            pendingLabel={t('pages.journals.actions.reversing')}
            onConfirm={handleReverseJournal}
            buttonProps={{ variant: 'outlined', color: 'error', disabled: !reverseJournalId }}
          >{t('pages.journals.actions.reverseJournal')}</VxConfirmActionButton>
        </VxStack>
      </VxPaper> : null}

      <PageBody>
        <Suspense fallback={<JournalSurfaceFallback />}>
          <JournalDataGrid rows={journals} isLoading={isLoading} onOpen={(journalId) => void handleOpenJournal(journalId)} />
        </Suspense>
      </PageBody>

      {selectedJournal ? (
        <VxPaper elevation={0} className="panel-card">
          <VxTypography component="h2" variant="h6" sx={{ mb: 2 }}>{t('pages.journals.details.title', { journalNumber: selectedJournal.journalNumber })}</VxTypography>
          <VxTypography color="text.secondary" sx={{ mb: 1 }}>{t('pages.journals.details.source')}: {selectedJournal.sourceDocumentType} / {selectedJournal.sourceDocumentId ?? t('pages.journals.details.notAvailable')}</VxTypography>
          <VxTypography color="text.secondary" sx={{ mb: 2 }}>{t('pages.journals.details.debit')} {selectedJournal.totalDebit.toFixed(2)} / {t('pages.journals.details.credit')} {selectedJournal.totalCredit.toFixed(2)}</VxTypography>
          <VxStack spacing={1}>
            {selectedJournal.lines.map((line) => (
              <VxBox key={line.id} sx={{ border: '1px solid rgba(15, 23, 42, 0.08)', borderRadius: 2, px: 2, py: 1.25 }}>
                <VxTypography sx={{ fontWeight: 700 }}>{line.accountCode} - {line.accountName}</VxTypography>
                <VxTypography variant="body2" color="text.secondary">{t('pages.journals.details.debit')} {line.debitAmount.toFixed(2)} / {t('pages.journals.details.credit')} {line.creditAmount.toFixed(2)}</VxTypography>
              </VxBox>
            ))}
          </VxStack>
        </VxPaper>
      ) : null}
    </VxStack>
  )
}
