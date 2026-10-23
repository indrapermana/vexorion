/// <reference types="vitest/globals" />

import { render, screen } from '@testing-library/react'
import { CurrencyProvider } from '../../../app/CurrencyContext'
import DashboardStorageSection from './DashboardStorageSection'

const t = ((key: string) => key) as never

describe('DashboardStorageSection', () => {
  it('renders usage and top consumer values', () => {
    render(
      <CurrencyProvider>
        <DashboardStorageSection
          t={t}
          summary={{
            tenantId: 'tenant-1',
            usedBytes: 1024,
            reservedBytes: 0,
            maxStorageBytes: 2048,
            usedPercent: 50,
            thresholdStatus: 'normal',
            lastCalculatedAtUtc: new Date().toISOString(),
            planCode: 'BASIC',
            planName: 'Basic Plan',
          }}
          topConsumers={{
            tenantId: 'tenant-1',
            topProjects: [
              { projectId: 'p1', projectName: 'Bridge Project', totalBytes: 1024, documentCount: 2 },
            ],
            topDocuments: [
              { projectDocumentId: 'd1', projectId: 'p1', title: 'Blueprint', fileName: 'blueprint.pdf', fileSizeBytes: 900 },
            ],
          }}
        />
      </CurrencyProvider>,
    )

    expect(screen.getByRole('heading', { level: 2, name: 'dashboard.storage.title' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'dashboard.storage.topProjects' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'dashboard.storage.topDocuments' })).toBeInTheDocument()
    expect(screen.getByText('Bridge Project')).toBeInTheDocument()
    expect(screen.getByText('Blueprint')).toBeInTheDocument()
    expect(screen.getByText('50% dashboard.storage.used')).toBeInTheDocument()
  })
})