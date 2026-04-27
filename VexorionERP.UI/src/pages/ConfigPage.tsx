import { useTranslation } from 'react-i18next'
import ConfigFeaturePage from '../features/config/pages/ConfigPage'

export default function ConfigPage() {
	useTranslation()
	return <ConfigFeaturePage />
}
