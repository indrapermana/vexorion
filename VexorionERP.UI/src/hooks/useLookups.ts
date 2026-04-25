import { useCallback } from 'react'
import { getCustomers, getInventoryBalances, getProducts, getSuppliers, getWarehouses } from '../lib/api'
import { useLookupCollection } from './useLookupCollection'

export function useCustomersLookup(enabled = true) {
  const loader = useCallback(() => getCustomers(), [])
  return useLookupCollection(loader, enabled)
}

export function useSuppliersLookup(enabled = true) {
  const loader = useCallback(() => getSuppliers(), [])
  return useLookupCollection(loader, enabled)
}

export function useProductsLookup(enabled = true) {
  const loader = useCallback(() => getProducts(), [])
  return useLookupCollection(loader, enabled)
}

export function useWarehousesLookup(enabled = true) {
  const loader = useCallback(() => getWarehouses(), [])
  return useLookupCollection(loader, enabled)
}

export function useInventoryBalancesLookup(enabled = true) {
  const loader = useCallback(() => getInventoryBalances(), [])
  return useLookupCollection(loader, enabled)
}