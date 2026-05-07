import { StrictMode, useEffect, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'
import { createAppTheme } from './theme'
import { ThemeModeProvider, useThemeMode } from './app/ThemeModeContext'
import { I18nProvider } from './app/I18nContext'
import { PosErrorBoundary } from './components/PosErrorBoundary'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function ThemedApp() {
  const { themeMode } = useThemeMode()
  const theme = useMemo(() => createAppTheme(themeMode), [themeMode])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme-mode', themeMode)
  }, [themeMode])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PosErrorBoundary>
        <App />
      </PosErrorBoundary>
    </ThemeProvider>
  )
}

function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeModeProvider>
        <I18nProvider>
          <ThemedApp />
        </I18nProvider>
      </ThemeModeProvider>
    </QueryClientProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
