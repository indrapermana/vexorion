import { useTranslation } from 'react-i18next'
import StockTransfersFeaturePage from '../features/stockTransfers/pages/StockTransfersPage'

export default function StockTransfersPage() {
	useTranslation()
	return <StockTransfersFeaturePage />
}