import { VxAlert, VxButton, VxDialog, VxDialogActions, VxDialogContent, VxDialogTitle, VxStack, VxTextField, VxTypography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'
import LookupSelectField from '../../../components/LookupSelectField'

export type AdjustmentLineForm = { productId: string; quantityDelta: string; unitCost: string; reason: string }
type Props = { open: boolean; mode: 'create' | 'edit'; saving: boolean; error: string | null; form: AdjustmentLineForm; productOptions: Array<{ value: string; label: string }>; autofillHint: string | null; onChange: (form: AdjustmentLineForm) => void; onProductChange: (value: string) => void; onClose: () => void; onSave: () => void }

export default function InventoryAdjustmentLineEditor({ open, mode, saving, error, form, productOptions, autofillHint, onChange, onProductChange, onClose, onSave }: Props) {
  const { t } = useTranslation()
  return <VxDialog open={open} onClose={onClose} fullWidth maxWidth="sm"><VxDialogTitle>{t(mode === 'create' ? 'pages.inventoryAdjustments.lineEditor.createTitle' : 'pages.inventoryAdjustments.lineEditor.editTitle')}</VxDialogTitle><VxDialogContent dividers><VxStack spacing={2.5} sx={{ pt: 1 }}>
    {!productOptions.length ? <VxAlert severity="warning">{t('pages.inventoryAdjustments.lineEditor.createProductsFirst')}</VxAlert> : null}{error ? <VxAlert severity="error">{error}</VxAlert> : null}
    <LookupSelectField label={t('pages.inventoryAdjustments.lineEditor.product')} value={form.productId} onChange={onProductChange} options={productOptions} disabled={!productOptions.length} emptyText={t('pages.inventoryAdjustments.lineEditor.noProducts')} requiredText={t('common.required')} />
    {autofillHint ? <VxTypography variant="body2" color="text.secondary">{autofillHint}</VxTypography> : null}
    <VxStack direction={{ xs: 'column', md: 'row' }} spacing={2}><VxTextField label={t('pages.inventoryAdjustments.lineEditor.quantityDelta')} type="number" value={form.quantityDelta} onChange={(event) => onChange({ ...form, quantityDelta: event.target.value })} helperText={t('pages.inventoryAdjustments.lineEditor.quantityHelp')} fullWidth /><VxTextField label={t('pages.inventoryAdjustments.lineEditor.unitCost')} type="number" value={form.unitCost} onChange={(event) => onChange({ ...form, unitCost: event.target.value })} fullWidth /></VxStack>
    <VxTextField label={t('pages.inventoryAdjustments.lineEditor.reason')} value={form.reason} onChange={(event) => onChange({ ...form, reason: event.target.value })} fullWidth />
  </VxStack></VxDialogContent><VxDialogActions sx={{ px: 3, py: 2 }}><VxButton onClick={onClose} disabled={saving}>{t('pages.inventoryAdjustments.lineEditor.cancel')}</VxButton><VxButton variant="contained" onClick={onSave} disabled={saving || !productOptions.length}>{saving ? t('pages.inventoryAdjustments.lineEditor.saving') : mode === 'create' ? t('pages.inventoryAdjustments.lineEditor.add') : t('pages.inventoryAdjustments.lineEditor.save')}</VxButton></VxDialogActions></VxDialog>
}
