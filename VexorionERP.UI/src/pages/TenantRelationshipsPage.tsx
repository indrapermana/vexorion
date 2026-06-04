import { useTranslation } from 'react-i18next'
import TenantRelationshipsFeaturePage from '../features/tenancy/pages/TenantRelationshipsPage'

export default function TenantRelationshipsPage() {
  useTranslation()
  return <TenantRelationshipsFeaturePage />
}
