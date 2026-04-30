export function formatCurrency(value: number, currencyCode = 'USD') {
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  })
}
