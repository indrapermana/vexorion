import { Paper, Skeleton, Stack } from '@vexorion/ui'

type DashboardSectionLoaderProps = {
  minHeight?: number
}

export default function DashboardSectionLoader({ minHeight = 200 }: DashboardSectionLoaderProps) {
  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, minHeight }}>
      <Stack spacing={1.2}>
        <Skeleton variant="text" width="35%" height={30} />
        <Skeleton variant="rounded" width="100%" height={Math.max(minHeight - 64, 80)} />
      </Stack>
    </Paper>
  )
}
