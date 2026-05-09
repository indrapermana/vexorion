import { VxCreateTheme } from '@vexorion/ui'

export type ThemeMode = 'light' | 'dark'

export function createAppTheme(mode: ThemeMode) {
  const isDark = mode === 'dark'

  return VxCreateTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#9E8FFF' : '#6C5CE7',
        light: isDark ? '#c1b8ff' : '#8a7df0',
        dark: isDark ? '#7868df' : '#5443cf',
        contrastText: '#f8f7ff',
      },
      secondary: {
        main: isDark ? '#7ee0ff' : '#A29BFE',
        light: isDark ? '#b5efff' : '#beb9ff',
        dark: isDark ? '#58b8d5' : '#877cf4',
        contrastText: isDark ? '#08202a' : '#241d54',
      },
      background: {
        default: isDark ? '#141226' : '#f4f1ff',
        paper: isDark ? 'rgba(26, 23, 46, 0.9)' : 'rgba(250, 248, 255, 0.84)',
      },
      text: {
        primary: isDark ? '#f0ecff' : '#241d54',
        secondary: isDark ? '#b7aed8' : '#68639a',
      },
      divider: isDark ? 'rgba(194, 184, 255, 0.22)' : 'rgba(108, 92, 231, 0.14)',
    },
    typography: {
      fontFamily: '"Space Grotesk", "Segoe UI", sans-serif',
      h4: {
        fontFamily: '"Fraunces", Georgia, serif',
        fontWeight: 700,
      },
      h5: {
        fontWeight: 700,
      },
      button: {
        textTransform: 'none',
        fontWeight: 700,
      },
    },
    shape: {
      borderRadius: 16,
    },
  })
}
