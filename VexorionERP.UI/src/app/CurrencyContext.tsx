import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getCompanies, getCompany } from '../lib/api/configurationCompanies'
import { useAuthStore } from './authStore'

interface CurrencyContextValue {
  currencyCode: string
  formatMoney: (value: number) => string
  setCurrencyCode: (currencyCode: string) => void
  refreshCurrency: () => Promise<void>
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currencyCode: 'USD',
  formatMoney: (value) =>
    value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }),
  setCurrencyCode: () => undefined,
  refreshCurrency: async () => undefined,
})

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currencyCode, setCurrencyCode] = useState('USD')
  const isAuthenticated = useAuthStore((state) => Boolean(state.session?.accessToken))

  const refreshCurrency = useCallback(async () => {
    const companies = await getCompanies()
    if (!companies.length) {
      return
    }

    const details = await getCompany(companies[0].id)
    if (details.currencyCode) {
      setCurrencyCode(details.currencyCode)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false
    async function load() {
      try {
        const companies = await getCompanies()
        if (cancelled || !companies.length) return
        const details = await getCompany(companies[0].id)
        if (!cancelled && details.currencyCode) {
          setCurrencyCode(details.currencyCode)
        }
      } catch {
        // keep default USD on error
      }
    }
    void load()
    return () => { cancelled = true }
  }, [isAuthenticated])

  const formatMoney = useCallback((value: number) =>
    value.toLocaleString(undefined, { style: 'currency', currency: currencyCode, maximumFractionDigits: 2 }), [currencyCode])

  const value = useMemo(() => ({
    currencyCode,
    formatMoney,
    setCurrencyCode,
    refreshCurrency,
  }), [currencyCode, formatMoney, refreshCurrency])

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
