import { useTranslation } from 'react-i18next'
import AccountsFeaturePage from '../features/accounts/pages/AccountsPage'

export default function AccountsPage() {
	useTranslation()
	return <AccountsFeaturePage />
}
