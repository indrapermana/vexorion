import type {
  OnboardTenantRequest,
  OnboardTenantResponse,
} from '../../types/api'
import { requestJson } from './core'

export function onboardTenant(request: OnboardTenantRequest) {
  return requestJson<OnboardTenantResponse>('/tenants/onboard', 'POST', request)
}