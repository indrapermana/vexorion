import { Card, CardContent, Typography, type CardProps } from '@mui/material'
import type { ReactNode } from 'react'

type VxCardProps = CardProps & {
  title: string
  subtitle?: string
  children: ReactNode
}

export function VxCard({ title, subtitle, children, ...cardProps }: VxCardProps) {
  return (
    <Card elevation={0} {...cardProps}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {subtitle}
          </Typography>
        ) : null}
        {children}
      </CardContent>
    </Card>
  )
}
