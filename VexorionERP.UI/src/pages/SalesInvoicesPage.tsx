import { useTranslation } from 'react-i18next'
import SalesInvoicesFeaturePage from '../features/salesInvoices/pages/SalesInvoicesPage'

export default function SalesInvoicesPage() {
	useTranslation()
	return <SalesInvoicesFeaturePage />
}