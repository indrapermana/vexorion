import { VxPaper, VxSkeleton, VxStack } from '@vexorion/ui'

type DashboardSectionLoaderProps = {
  minHeight?: number
}

export default function DashboardSectionLoader({ minHeight = 200 }: DashboardSectionLoaderProps) {
  return (
    <VxPaper elevation={0} sx={{ p: 2.5, borderRadius: 2, minHeight }}>
      <VxStack spacing={1.2}>
        <VxSkeleton variant="text" width="35%" height={30} />
        <VxSkeleton variant="rounded" width="100%" height={Math.max(minHeight - 64, 80)} />
      </VxStack>
    </VxPaper>
  )
}
