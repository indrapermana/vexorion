import { useTranslation } from 'react-i18next'
import SalesOrdersFeaturePage from '../features/salesOrders/pages/SalesOrdersPage'

export default function SalesOrdersPage() {
	useTranslation()
	return <SalesOrdersFeaturePage />
}