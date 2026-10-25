export type PaymentAllocationPreview = {
  invoiceBalance: number
  paymentAmount: number
  allocatedAmount: number
  unappliedAmount: number
  remainingBalance: number
}

export type PaymentAllocationError = 'exceedsBalance' | 'currencyMismatch'

export function getPaymentAllocationPreview(invoiceBalance: number, paymentAmount: number): PaymentAllocationPreview {
  const safeBalance = Number.isFinite(invoiceBalance) ? Math.max(invoiceBalance, 0) : 0
  const safePayment = Number.isFinite(paymentAmount) ? Math.max(paymentAmount, 0) : 0

  return {
    invoiceBalance: safeBalance,
    paymentAmount: safePayment,
    allocatedAmount: Math.min(safeBalance, safePayment),
    unappliedAmount: Math.max(safePayment - safeBalance, 0),
    remainingBalance: Math.max(safeBalance - safePayment, 0),
  }
}

export function getPaymentAllocationError(
  invoiceBalance: number,
  paymentAmount: number,
  invoiceCurrency: string,
  paymentCurrency: string,
): PaymentAllocationError | null {
  if (paymentAmount > invoiceBalance) return 'exceedsBalance'
  if (paymentCurrency.trim().toUpperCase() !== invoiceCurrency.trim().toUpperCase()) return 'currencyMismatch'
  return null
}