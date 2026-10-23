import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen } from '../testUtils'
import { PosErrorBoundary } from '../../components/PosErrorBoundary'

vi.mock('../../app/I18nContext', () => ({
  I18nProvider: ({ children }: { children: ReactNode }) => children,
  translateCurrentLocale: (key: string) => ({
    'errorBoundary.title': 'Something went wrong',
    'errorBoundary.message': 'The application encountered an unexpected error.',
  })[key] ?? key,
}))

afterEach(() => {
  vi.restoreAllMocks()
})

describe('POS live feedback accessibility', () => {
  it('announces unexpected runtime failures as alerts', () => {
    renderWithProviders(
      <PosErrorBoundary>
        <ThrowOnRender />
      </PosErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i)
    expect(screen.queryByText('test render failure')).not.toBeInTheDocument()
  })
})

function ThrowOnRender(): never {
  throw new Error('test render failure')
}
