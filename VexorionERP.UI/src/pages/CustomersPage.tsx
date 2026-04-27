import { useTranslation } from 'react-i18next'
import CustomersFeaturePage from '../features/customers/pages/CustomersPage'

export default function CustomersPage() {
	useTranslation()
	return <CustomersFeaturePage />
}