type AgingTotalItem = {
  currencyCode: string
  buckets: { total: number }
}

export function formatReportCurrency(value: number, currencyCode: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(value)
  } catch {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)} ${currencyCode}`
  }
}

export function formatReportDate(date: string, locale: string) {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return date
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(year, month - 1, day))
}

export function getAgingTotalsByCurrency<T extends AgingTotalItem>(items: T[]) {
  const totals = new Map<string, number>()
  for (const item of items) {
    totals.set(item.currencyCode, (totals.get(item.currencyCode) ?? 0) + item.buckets.total)
  }
  return [...totals.entries()].sort(([left], [right]) => left.localeCompare(right))
}