import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6C5CE7',
      light: '#8a7df0',
      dark: '#5443cf',
      contrastText: '#f8f7ff',
    },
    secondary: {
      main: '#A29BFE',
      light: '#beb9ff',
      dark: '#877cf4',
      contrastText: '#241d54',
    },
    background: {
      default: '#f4f1ff',
      paper: 'rgba(250, 248, 255, 0.84)',
    },
    text: {
      primary: '#241d54',
      secondary: '#68639a',
    },
    divider: 'rgba(108, 92, 231, 0.14)',
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
          background:
            'radial-gradient(circle at top left, rgba(162,155,254,0.28), transparent 28%), radial-gradient(circle at right 20%, rgba(108,92,231,0.18), transparent 24%), linear-gradient(180deg, #f8f6ff 0%, #f2efff 100%)',
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

export default theme