import { useTranslation } from 'react-i18next'
import PurchaseReceiptsFeaturePage from '../features/purchaseReceipts/pages/PurchaseReceiptsPage'

export default function PurchaseReceiptsPage() {
	useTranslation()
	return <PurchaseReceiptsFeaturePage />
}
