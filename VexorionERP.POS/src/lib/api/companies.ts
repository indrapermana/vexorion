import type { CompanyListItemResponse } from '../../types/api'
import { requestJson } from './core'

export function getCompanies() {
  return requestJson<CompanyListItemResponse[]>('/companies')
}
