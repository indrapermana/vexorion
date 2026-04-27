import { createTheme } from '@mui/material/styles'

export type ThemeMode = 'light' | 'dark'

export function createAppTheme(mode: ThemeMode) {
  const isDark = mode === 'dark'

  return createTheme({
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
      h1: {
        fontFamily: '"Fraunces", Georgia, serif',
        fontWeight: 700,
        fontSize: 'clamp(3rem, 6vw, 5.6rem)',
        lineHeight: 0.98,
        letterSpacing: '-0.05em',
      },
      h2: {
        fontFamily: '"Fraunces", Georgia, serif',
        fontWeight: 600,
        letterSpacing: '-0.03em',
      },
      h5: {
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      button: {
        fontWeight: 700,
        letterSpacing: '0.01em',
        textTransform: 'none',
      },
      body1: {
        lineHeight: 1.7,
      },
    },
    shape: {
      borderRadius: 20,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            background: isDark
              ? 'radial-gradient(circle at top left, rgba(126, 108, 220, 0.22), transparent 28%), radial-gradient(circle at right 20%, rgba(76, 147, 255, 0.2), transparent 24%), linear-gradient(180deg, #181430 0%, #121024 100%)'
              : 'radial-gradient(circle at top left, rgba(162,155,254,0.28), transparent 28%), radial-gradient(circle at right 20%, rgba(108,92,231,0.18), transparent 24%), linear-gradient(180deg, #f8f6ff 0%, #f2efff 100%)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            paddingInline: 22,
            paddingBlock: 10,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backdropFilter: 'blur(16px)',
            backgroundImage: 'none',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 700,
          },
        },
      },
    },
  })
}

const theme = createAppTheme('light')

export default theme