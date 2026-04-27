import { useTranslation } from 'react-i18next'
import StockCountsFeaturePage from '../features/stockCounts/pages/StockCountsPage'

export default function StockCountsPage() {
	useTranslation()
	return <StockCountsFeaturePage />
}
