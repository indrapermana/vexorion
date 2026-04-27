import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import './index.css'
import './i18n'
import App from './App.tsx'
import { ThemeModeProvider } from './app/ThemeModeContext'
import { createAppTheme, type ThemeMode } from './theme.ts'

const THEME_MODE_STORAGE_KEY = 'vexorion.themeMode'
const queryClient = new QueryClient()

function normalizeThemeMode(value: string | null): ThemeMode {
  return value === 'dark' ? 'dark' : 'light'
}

function Root() {
  useTranslation()

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => normalizeThemeMode(localStorage.getItem(THEME_MODE_STORAGE_KEY)))
  const theme = useMemo(() => createAppTheme(themeMode), [themeMode])

  useEffect(() => {
    localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode)
    document.documentElement.setAttribute('data-theme-mode', themeMode)
  }, [themeMode])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeModeProvider value={{ mode: themeMode, setMode: setThemeMode }}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </ThemeModeProvider>
    </QueryClientProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
