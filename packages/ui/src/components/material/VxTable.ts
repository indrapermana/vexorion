import { Table } from '@mui/material'
import type { TableProps } from '@mui/material'
import { createElement } from 'react'

export function VxTable({ size = 'small', sx, ...props }: TableProps) {
  return createElement(Table, {
    ...props,
    size,
    sx: [
      { minWidth: '100%', width: 'max-content' },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ],
  })
}
