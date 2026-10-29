import { VxBox } from '@vexorion/ui'
import type { ReactNode } from 'react'

export type ProjectDetailTab = 'overview' | 'parties' | 'assignments' | 'documents' | 'history'

type ProjectTabPanelProps = {
  tab: ProjectDetailTab
  activeTab: ProjectDetailTab
  children?: ReactNode
}

export default function ProjectTabPanel({ tab, activeTab, children }: ProjectTabPanelProps) {
  return (
    <VxBox
      role="tabpanel"
      id={`project-panel-${tab}`}
      aria-labelledby={`project-tab-${tab}`}
      hidden={activeTab !== tab}
      tabIndex={0}
      sx={{ minWidth: 0 }}
    >
      {children}
    </VxBox>
  )
}
