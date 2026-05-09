import type { ReactNode } from 'react'
import { Alert, Box, Button, Paper, Stack, Typography } from '@vexorion/ui'
import { useTranslation } from 'react-i18next'

type MetricCard = {
  icon: ReactNode
  label: string
  value: string | number
}

type OrderWorkspaceProps = {
  title: string
  description: string
  createLabel: string
  onCreate: () => void
  disableCreate?: boolean
  metrics: MetricCard[]
  alerts?: Array<{ severity: 'warning' | 'error' | 'success' | 'info', message: string }>
  grid: ReactNode
  linesPanel: ReactNode
  documentsPanel?: ReactNode
  editor?: ReactNode
  deleteDialog?: ReactNode
}

export default function OrderWorkspace({
  title,
  description,
  createLabel,
  onCreate,
  disableCreate,
  metrics,
  alerts = [],
  grid,
  linesPanel,
  documentsPanel,
  editor,
  deleteDialog,
}: OrderWorkspaceProps) {
  useTranslation()
  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="panel-card">
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} sx={{ justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>{title}</Typography>
            <Typography color="text.secondary">{description}</Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
            <Button variant="contained" onClick={onCreate} disabled={disableCreate}>{createLabel}</Button>
            {metrics.map((metric) => (
              <Paper key={metric.label} elevation={0} className="products-metric-card">
                {metric.icon}
                <Box>
                  <Typography variant="body2" color="text.secondary">{metric.label}</Typography>
                  <Typography variant="h6">{metric.value}</Typography>
                </Box>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </Paper>

      {alerts.map((alert) => <Alert key={`${alert.severity}:${alert.message}`} severity={alert.severity}>{alert.message}</Alert>)}

      <Paper elevation={0} className="panel-card products-grid-panel">
        {grid}
      </Paper>

      {linesPanel}
      {documentsPanel}
      {editor}
      {deleteDialog}
    </Stack>
  )
}