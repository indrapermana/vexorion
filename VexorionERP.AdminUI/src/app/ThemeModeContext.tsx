import { createContext, useContext, type ReactNode } from 'react'
import type { ThemeMode } from '../theme'

type ThemeModeContextValue = {
  mode: ThemeMode
  setMode: (nextMode: ThemeMode) => void
}

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined)

type ThemeModeProviderProps = {
  value: ThemeModeContextValue
  children: ReactNode
}

export function ThemeModeProvider({ value, children }: ThemeModeProviderProps) {
  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext)
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeModeProvider')
  }

  return context
}
