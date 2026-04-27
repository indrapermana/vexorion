import { useTranslation } from 'react-i18next'
import PurchaseInvoicesFeaturePage from '../features/purchaseInvoices/pages/PurchaseInvoicesPage'

export default function PurchaseInvoicesPage() {
	useTranslation()
	return <PurchaseInvoicesFeaturePage />
}