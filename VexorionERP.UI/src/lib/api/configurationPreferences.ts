import type {
  TenantPreferencesResponse,
  UpdateDiscountConfigurationRequest,
  UpdateMenuConfigurationRequest,
} from '../../types/api'
import { requestJson } from './core'

export function getTenantPreferences() {
  return requestJson<TenantPreferencesResponse>('/configuration/preferences')
}

export function updateMenuConfiguration(request: UpdateMenuConfigurationRequest) {
  return requestJson<TenantPreferencesResponse>('/configuration/preferences/menu', 'PUT', request)
}

export function updateDiscountConfiguration(request: UpdateDiscountConfigurationRequest) {
  return requestJson<TenantPreferencesResponse>('/configuration/preferences/discount', 'PUT', request)
}
