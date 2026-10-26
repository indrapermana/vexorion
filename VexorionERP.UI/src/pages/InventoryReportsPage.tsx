import { useTranslation } from 'react-i18next'
import InventoryReportsFeaturePage from '../features/inventoryReports/pages/InventoryReportsPage'

export default function InventoryReportsPage() {
  useTranslation()
  return <InventoryReportsFeaturePage />
}