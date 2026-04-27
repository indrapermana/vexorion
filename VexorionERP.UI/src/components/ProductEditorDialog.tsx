import { useTranslation } from 'react-i18next'
import ProductEditorFeatureDialog from '../features/products/components/ProductEditorDialog'

export default function ProductEditorDialog() {
	useTranslation()
	return <ProductEditorFeatureDialog />
}