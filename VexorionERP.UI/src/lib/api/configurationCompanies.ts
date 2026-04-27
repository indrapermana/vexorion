import type { CompanyDetailsResponse, CompanyListItemResponse, UpdateCompanyRequest } from '../../types/api'
import { requestJson } from './core'

export function getCompanies() {
  return requestJson<CompanyListItemResponse[]>('/companies')
}

export function getCompany(companyId: string) {
  return requestJson<CompanyDetailsResponse>(`/companies/${companyId}`)
}

export function updateCompany(companyId: string, request: UpdateCompanyRequest) {
  return requestJson<CompanyDetailsResponse>(`/companies/${companyId}`, 'PUT', request)
}
