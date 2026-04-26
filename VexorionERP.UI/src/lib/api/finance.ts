import type {
  AccountDetailsResponse,
  AccountListItemResponse,
  CreateAccountRequest,
  CreateFiscalPeriodRequest,
  FiscalPeriodDetailsResponse,
  FiscalPeriodListItemResponse,
  JournalEntryDetailsResponse,
  JournalEntryListItemResponse,
  PostPurchaseInvoiceRequest,
  PostSalesInvoiceRequest,
  ReverseJournalRequest,
  UpdateAccountRequest,
  UpdateFiscalPeriodRequest,
} from '../../types/api'
import { requestJson } from './core'

export function getAccounts() {
  return requestJson<AccountListItemResponse[]>('/accounts')
}

export function getAccount(accountId: string) {
  return requestJson<AccountDetailsResponse>(`/accounts/${accountId}`)
}

export function createAccount(request: CreateAccountRequest) {
  return requestJson<AccountDetailsResponse>('/accounts', 'POST', request)
}

export function updateAccount(accountId: string, request: UpdateAccountRequest) {
  return requestJson<AccountDetailsResponse>(`/accounts/${accountId}`, 'PUT', request)
}

export function deleteAccount(accountId: string) {
  return requestJson<void>(`/accounts/${accountId}`, 'DELETE')
}

export function getFiscalPeriods() {
  return requestJson<FiscalPeriodListItemResponse[]>('/fiscal-periods')
}

export function getFiscalPeriod(fiscalPeriodId: string) {
  return requestJson<FiscalPeriodDetailsResponse>(`/fiscal-periods/${fiscalPeriodId}`)
}

export function createFiscalPeriod(request: CreateFiscalPeriodRequest) {
  return requestJson<FiscalPeriodDetailsResponse>('/fiscal-periods', 'POST', request)
}

export function updateFiscalPeriod(fiscalPeriodId: string, request: UpdateFiscalPeriodRequest) {
  return requestJson<FiscalPeriodDetailsResponse>(`/fiscal-periods/${fiscalPeriodId}`, 'PUT', request)
}

export function closeFiscalPeriod(fiscalPeriodId: string) {
  return requestJson<FiscalPeriodDetailsResponse>(`/fiscal-periods/${fiscalPeriodId}/close`, 'POST')
}

export function reopenFiscalPeriod(fiscalPeriodId: string) {
  return requestJson<FiscalPeriodDetailsResponse>(`/fiscal-periods/${fiscalPeriodId}/reopen`, 'POST')
}

export function getJournals() {
  return requestJson<JournalEntryListItemResponse[]>('/journals')
}

export function getJournal(journalEntryId: string) {
  return requestJson<JournalEntryDetailsResponse>(`/journals/${journalEntryId}`)
}

export function postSalesInvoice(salesInvoiceId: string, request: PostSalesInvoiceRequest) {
  return requestJson<JournalEntryDetailsResponse>(`/posting/sales-invoices/${salesInvoiceId}`, 'POST', request)
}

export function postPurchaseInvoice(purchaseInvoiceId: string, request: PostPurchaseInvoiceRequest) {
  return requestJson<JournalEntryDetailsResponse>(`/posting/purchase-invoices/${purchaseInvoiceId}`, 'POST', request)
}

export function reverseJournal(journalEntryId: string, request: ReverseJournalRequest) {
  return requestJson<JournalEntryDetailsResponse>(`/posting/journals/${journalEntryId}/reverse`, 'POST', request)
}
