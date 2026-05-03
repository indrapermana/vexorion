import { type ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { I18nProvider } from '../app/I18nContext'
import { ThemeModeProvider } from '../app/ThemeModeContext'

/** Wraps components with all required context providers for testing. */
function AllProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeModeProvider>
      <I18nProvider>{children}</I18nProvider>
    </ThemeModeProvider>
  )
}

export function renderWithProviders(ui: ReactNode, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options })
}

export { screen, fireEvent, waitFor, within } from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
