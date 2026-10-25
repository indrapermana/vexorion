import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CreatePurchaseReceiptDialog from '../../purchaseReceipts/components/CreatePurchaseReceiptDialog'
import CreateSalesShipmentDialog from './CreateSalesShipmentDialog'

const apiMocks = vi.hoisted(() => ({
  createPurchaseReceipt: vi.fn(),
  createSalesShipment: vi.fn(),
  getPurchaseOrderLines: vi.fn(),
  getSalesOrderLines: vi.fn(),
}))
const testData = vi.hoisted(() => ({ products: [{ id: 'product-1', name: 'Widget' }] }))
const copy: Record<string, string> = {
  'pages.salesShipments.editor.title': 'Create shipment',
  'pages.salesShipments.editor.number': 'Shipment number',
  'pages.salesShipments.editor.date': 'Shipment date',
  'pages.salesShipments.editor.warehouse': 'Warehouse',
  'pages.salesShipments.editor.notes': 'Notes',
  'pages.salesShipments.editor.lines': 'Shipment lines',
  'pages.salesShipments.editor.product': 'Product',
  'pages.salesShipments.editor.ordered': 'Ordered',
  'pages.salesShipments.editor.processed': 'Already shipped',
  'pages.salesShipments.editor.remaining': 'Remaining',
  'pages.salesShipments.editor.unitPrice': 'Unit price',
  'pages.salesShipments.editor.shipQuantity': 'Enter quantity',
  'pages.salesShipments.editor.resulting': 'After shipment',
  'pages.salesShipments.editor.enterQuantityFor': 'Line {{line}}, {{product}}',
  'pages.salesShipments.editor.quantityExceedsRemaining': 'Shipment exceeds remaining quantity.',
  'pages.salesShipments.editor.cancel': 'Cancel',
  'pages.salesShipments.editor.create': 'Create shipment',
  'pages.purchaseReceipts.editor.title': 'Create receipt',
  'pages.purchaseReceipts.editor.number': 'Receipt number',
  'pages.purchaseReceipts.editor.date': 'Receipt date',
  'pages.purchaseReceipts.editor.warehouse': 'Warehouse',
  'pages.purchaseReceipts.editor.notes': 'Notes',
  'pages.purchaseReceipts.editor.lines': 'Receipt lines',
  'pages.purchaseReceipts.editor.product': 'Product',
  'pages.purchaseReceipts.editor.ordered': 'Ordered',
  'pages.purchaseReceipts.editor.processed': 'Already received',
  'pages.purchaseReceipts.editor.remaining': 'Remaining',
  'pages.purchaseReceipts.editor.unitCost': 'Unit cost',
  'pages.purchaseReceipts.editor.receiveQuantity': 'Enter quantity',
  'pages.purchaseReceipts.editor.resulting': 'After receipt',
  'pages.purchaseReceipts.editor.enterQuantityFor': 'Line {{line}}, {{product}}',
  'pages.purchaseReceipts.editor.quantityExceedsRemaining': 'Receipt exceeds remaining quantity.',
  'pages.purchaseReceipts.editor.cancel': 'Cancel',
  'pages.purchaseReceipts.editor.create': 'Create receipt',
  'common.required': 'Required',
}
const translate = (key: string, options?: { product?: string, line?: number }) => (
  (copy[key] ?? key).replace('{{product}}', options?.product ?? '').replace('{{line}}', String(options?.line ?? ''))
)

vi.mock('../../../lib/api', () => ({ ApiError: class ApiError extends Error {}, ...apiMocks }))
vi.mock('../../../app/CurrencyContext', () => ({ useCurrency: () => ({ formatMoney: (value: number) => `$${value.toFixed(2)}` }) }))
vi.mock('../../../hooks/useLookups', () => ({ useProductsLookup: () => ({ items: testData.products }) }))
vi.mock('../../../hooks/useUnsavedChangesPrompt', () => ({
  useUnsavedChangesPrompt: (_dirty: boolean, _busy: boolean, onClose: () => void) => ({ requestClose: onClose, confirmationDialog: null }),
}))
vi.mock('../../../components/LookupSelectField', () => ({ default: () => <div>Warehouse selector</div> }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: translate }) }))
vi.mock('@vexorion/ui', () => ({
  VxAlert: ({ children }: { children?: ReactNode }) => <div role="alert">{children}</div>,
  VxBox: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  VxButton: ({ children, onClick, disabled }: { children?: ReactNode, onClick?: () => void, disabled?: boolean }) => <button type="button" onClick={onClick} disabled={disabled}>{children}</button>,
  VxCircularProgress: () => <span>Loading</span>,
  VxDialog: ({ open, children }: { open: boolean, children?: ReactNode }) => open ? <div role="dialog">{children}</div> : null,
  VxDialogActions: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  VxDialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  VxDialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  VxDivider: () => <hr />,
  VxStack: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  VxTable: ({ children }: { children?: ReactNode }) => <table>{children}</table>,
  VxTableBody: ({ children }: { children?: ReactNode }) => <tbody>{children}</tbody>,
  VxTableCell: ({ children }: { children?: ReactNode }) => <td>{children}</td>,
  VxTableContainer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  VxTableHead: ({ children }: { children?: ReactNode }) => <thead>{children}</thead>,
  VxTableRow: ({ children }: { children?: ReactNode }) => <tr>{children}</tr>,
  VxTextField: ({ label, value, onChange, type, slotProps, disabled, error }: {
    label?: string
    value?: string
    onChange?: (event: { target: { value: string } }) => void
    type?: string
    slotProps?: { htmlInput?: React.InputHTMLAttributes<HTMLInputElement> }
    disabled?: boolean
    error?: boolean
  }) => (
    <label>
      {label}
      <input
        aria-label={slotProps?.htmlInput?.['aria-label'] ?? label}
        type={type ?? 'text'}
        min={slotProps?.htmlInput?.min}
        max={slotProps?.htmlInput?.max}
        step={slotProps?.htmlInput?.step}
        inputMode={slotProps?.htmlInput?.inputMode}
        value={value ?? ''}
        disabled={disabled}
        aria-invalid={error || undefined}
        onChange={(event) => onChange?.({ target: { value: event.target.value } })}
      />
    </label>
  ),
  VxTypography: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

beforeEach(() => vi.clearAllMocks())

describe('shipment and receipt quantity entry', () => {
  it('shows sales order progress, calculates the projected shipment, and caps entry', async () => {
    apiMocks.getSalesOrderLines.mockResolvedValue([
      { id: 'line-1', productId: 'product-1', quantity: 10, shippedQuantity: 6, remainingQuantity: 4, unitPrice: 5, isActive: true },
      { id: 'line-2', productId: 'product-1', quantity: 3, shippedQuantity: 3, remainingQuantity: 0, unitPrice: 5, isActive: true },
    ])
    render(<CreateSalesShipmentDialog open salesOrderId="order-1" warehouses={[]} onClose={vi.fn()} onSaved={vi.fn()} />)

    const quantity = await screen.findByRole('spinbutton', { name: 'Line 1, Widget' })
    expect(screen.getByText('Ordered')).toBeInTheDocument()
    expect(screen.getByText('Already shipped')).toBeInTheDocument()
    expect(screen.getByText('Remaining')).toBeInTheDocument()
    expect(screen.getByText('After shipment')).toBeInTheDocument()
    expect(quantity).toHaveAttribute('max', '4')
    expect(screen.getByRole('spinbutton', { name: 'Line 2, Widget' })).toBeDisabled()

    fireEvent.change(quantity, { target: { value: '2' } })
    expect(screen.getByText('8')).toBeInTheDocument()
    fireEvent.change(quantity, { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create shipment' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Shipment exceeds remaining quantity.')
    expect(apiMocks.createSalesShipment).not.toHaveBeenCalled()
  })

  it('shows receipt progress and prevents entering more than the remaining quantity', async () => {
    apiMocks.getPurchaseOrderLines.mockResolvedValue([
      { id: 'line-1', productId: 'product-1', quantity: 10, receivedQuantity: 6, remainingQuantity: 4, unitCost: 5, isActive: true },
    ])
    render(<CreatePurchaseReceiptDialog open purchaseOrderId="order-1" warehouses={[]} onClose={vi.fn()} onSaved={vi.fn()} />)

    const quantity = await screen.findByRole('spinbutton', { name: 'Line 1, Widget' })
    expect(screen.getByText('Already received')).toBeInTheDocument()
    expect(quantity).toHaveAttribute('max', '4')
    fireEvent.change(quantity, { target: { value: '5' } })
    expect(quantity).toHaveAttribute('aria-invalid', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Create receipt' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Receipt exceeds remaining quantity.')
    expect(apiMocks.createPurchaseReceipt).not.toHaveBeenCalled()
  })
})