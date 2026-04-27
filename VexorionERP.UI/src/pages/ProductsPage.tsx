import { useTranslation } from 'react-i18next'
import ProductsFeaturePage from '../features/products/pages/ProductsPage'

export default function ProductsPage() {
	useTranslation()
	return <ProductsFeaturePage />
}