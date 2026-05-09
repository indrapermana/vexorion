import { BarChart, LineChart } from '@mui/x-charts'
import type { BarChartProps, LineChartProps } from '@mui/x-charts'

export function VxBarChart(props: BarChartProps) {
  return <BarChart {...props} />
}

export function VxLineChart(props: LineChartProps) {
  return <LineChart {...props} />
}
