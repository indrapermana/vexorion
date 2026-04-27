import { useTranslation } from 'react-i18next'
import JournalsFeaturePage from '../features/journals/pages/JournalsPage'

export default function JournalsPage() {
	useTranslation()
	return <JournalsFeaturePage />
}
