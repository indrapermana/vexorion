import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { ThemeMode } from '../theme'

const THEME_MODE_STORAGE_KEY = 'vexorion.pos.themeMode'

type ThemeModeContextValue = {
  themeMode: ThemeMode
  toggleThemeMode: () => void
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null)

function normalizeThemeMode(value: string | null): ThemeMode {
  return value === 'dark' ? 'dark' : 'light'
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => normalizeThemeMode(localStorage.getItem(THEME_MODE_STORAGE_KEY)))

  const value = useMemo<ThemeModeContextValue>(
    () => ({
      themeMode,
      toggleThemeMode: () => {
        setThemeMode((current) => {
          const nextMode: ThemeMode = current === 'light' ? 'dark' : 'light'
          localStorage.setItem(THEME_MODE_STORAGE_KEY, nextMode)
          return nextMode
        })
      },
    }),
    [themeMode],
  )

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext)
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeModeProvider')
  }

  return context
}
