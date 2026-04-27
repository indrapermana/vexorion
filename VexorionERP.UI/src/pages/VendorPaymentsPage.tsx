import { useTranslation } from 'react-i18next'
import VendorPaymentsFeaturePage from '../features/vendorPayments/pages/VendorPaymentsPage'

export default function VendorPaymentsPage() {
	useTranslation()
	return <VendorPaymentsFeaturePage />
}
