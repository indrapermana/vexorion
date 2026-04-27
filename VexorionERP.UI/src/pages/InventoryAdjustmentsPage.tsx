import { useTranslation } from 'react-i18next'
import InventoryAdjustmentsFeaturePage from '../features/inventoryAdjustments/pages/InventoryAdjustmentsPage'

export default function InventoryAdjustmentsPage() {
	useTranslation()
	return <InventoryAdjustmentsFeaturePage />
}