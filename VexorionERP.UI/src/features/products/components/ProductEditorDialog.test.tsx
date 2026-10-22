/// <reference types="vitest/globals" />

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { MouseEventHandler, ReactNode } from 'react'
import ProductEditorDialog from './ProductEditorDialog'

const apiMocks = vi.hoisted(() => ({
  getProduct: vi.fn(),
  uploadProductImage: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => {
    const translations: Record<string, string> = {
      'components.products.editor.chooseImage': 'Choose product image',
      'components.products.editor.imagePreview': 'Product image preview',
      'components.products.editor.productImage': 'Product image',
      'components.products.editor.uploadImage': 'Upload image',
    }
    return {
      t: (key: string, options?: { defaultValue?: string }) => translations[key] ?? options?.defaultValue ?? key,
    }
  },
}))

vi.mock('../../../lib/api', () => ({
  ApiError: class ApiError extends Error {},
  ...apiMocks,
}))

vi.mock('@vexorion/ui', () => {
  const passThrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return {
    VxAlert: ({ children }: { children?: ReactNode }) => <div role="alert">{children}</div>,
    VxBox: ({ component, src, alt, children }: { component?: string, src?: string, alt?: string, children?: ReactNode }) => (
      component === 'img' ? <img src={src} alt={alt} /> : <div>{children}</div>
    ),
    VxButton: ({ children, onClick, disabled }: { children?: ReactNode, onClick?: MouseEventHandler<HTMLButtonElement>, disabled?: boolean }) => (
      <button type="button" onClick={onClick} disabled={disabled}>{children}</button>
    ),
    VxCircularProgress: () => <div>loading</div>,
    VxDialog: ({ open, children }: { open: boolean, children?: ReactNode }) => open ? <div>{children}</div> : null,
    VxDialogActions: passThrough,
    VxDialogContent: passThrough,
    VxDialogTitle: passThrough,
    VxFormControlLabel: ({ control, label }: { control: ReactNode, label: ReactNode }) => <label>{control}{label}</label>,
    VxStack: passThrough,
    VxSwitch: () => <input type="checkbox" />,
    VxTextField: ({ label, value, onChange, type }: { label?: string, value?: unknown, onChange?: (event: { target: { value: string } }) => void, type?: string }) => (
      <label>{label}<input aria-label={label} type={type ?? 'text'} value={String(value ?? '')} onChange={(event) => onChange?.(event)} /></label>
    ),
    VxTypography: passThrough,
  }
})

describe('ProductEditorDialog image upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:preview'),
      revokeObjectURL: vi.fn(),
    })
    apiMocks.getProduct.mockResolvedValue({
      id: 'product-1', tenantId: 'tenant-1', sku: 'SKU-1', name: 'Product', description: null,
      unitOfMeasure: 'EA', standardCost: 1, salesPrice: 2, reorderLevel: 0, isActive: true, imageUrl: null,
    })
  })

  it('uploads a selected image for an existing product and shows the returned preview', async () => {
    apiMocks.uploadProductImage.mockResolvedValue({
      productId: 'product-1',
      imageUrl: 'https://images.vexorionerp.com/product.png',
      thumbnailUrl: 'https://images.vexorionerp.com/thumb_product.jpg',
    })

    render(<ProductEditorDialog open mode="edit" productId="product-1" onClose={vi.fn()} onSaved={vi.fn()} />)

    const input = await screen.findByLabelText('Choose product image')
    const file = new File(['image'], 'product.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(await screen.findByRole('img', { name: 'Product image preview' })).toHaveAttribute('src', 'blob:preview')
    fireEvent.click(screen.getByRole('button', { name: 'Upload image' }))

    await waitFor(() => expect(apiMocks.uploadProductImage).toHaveBeenCalledWith('product-1', file))
    expect(screen.getByRole('alert')).toHaveTextContent('Product image uploaded.')
  })
})
