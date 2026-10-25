import { render, screen } from '@testing-library/react'
import type { ElementType, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import InventoryEffectPreview from './InventoryEffectPreview'

vi.mock('@vexorion/ui', () => ({
  VxBox: ({ children, component: Component = 'div', ...props }: { children?: ReactNode, component?: ElementType, 'aria-label'?: string }) => {
    return <Component {...props}>{children}</Component>
  },
  VxTable: ({ children }: { children?: ReactNode }) => <table>{children}</table>,
  VxTableBody: ({ children }: { children?: ReactNode }) => <tbody>{children}</tbody>,
  VxTableCell: ({ children }: { children?: ReactNode }) => <td>{children}</td>,
  VxTableContainer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  VxTableHead: ({ children }: { children?: ReactNode }) => <thead>{children}</thead>,
  VxTableRow: ({ children }: { children?: ReactNode }) => <tr>{children}</tr>,
  VxTypography: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

describe('InventoryEffectPreview', () => {
  it('shows the warehouse, current quantity, change, and resulting quantity', () => {
    render(<InventoryEffectPreview
      title="Transfer posting preview"
      productLabel="Product"
      warehouseLabel="Warehouse"
      currentLabel="On hand before"
      changeLabel="Quantity change"
      resultingLabel="On hand after"
      rows={[{ id: 'line-source', product: 'Widget', warehouse: 'Main', currentQuantity: 10, quantityChange: -3 }]}
    />)

    expect(screen.getByRole('region', { name: 'Transfer posting preview' })).toHaveTextContent('Widget')
    expect(screen.getByText('Main')).toBeInTheDocument()
    expect(screen.getByText('10.00')).toBeInTheDocument()
    expect(screen.getByText('-3.00')).toBeInTheDocument()
    expect(screen.getByText('7.00')).toBeInTheDocument()
  })
})