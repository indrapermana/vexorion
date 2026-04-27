import { useTranslation } from 'react-i18next'
import CustomerPaymentsFeaturePage from '../features/customerPayments/pages/CustomerPaymentsPage'

export default function CustomerPaymentsPage() {
	useTranslation()
	return <CustomerPaymentsFeaturePage />
}
