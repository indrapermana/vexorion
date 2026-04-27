import { useTranslation } from 'react-i18next'
import PurchaseOrdersFeaturePage from '../features/purchaseOrders/pages/PurchaseOrdersPage'

export default function PurchaseOrdersPage() {
	useTranslation()
	return <PurchaseOrdersFeaturePage />
}