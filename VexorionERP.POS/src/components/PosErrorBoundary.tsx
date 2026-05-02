import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import { posLogger } from '../lib/posLogger'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class PosErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null, errorInfo: null }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo })

    posLogger.error('runtime.uncaughtError', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  override render() {
    if (this.state.error) {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            p: 4,
          }}
        >
          <Stack spacing={3} sx={{ maxWidth: 520, width: '100%' }}>
            <Alert severity="error" variant="filled">
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Something went wrong
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                An unexpected error occurred in the POS application. Your last transaction data is
                preserved. Reload the page to recover.
              </Typography>
            </Alert>

            <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 2 }}>
              <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {this.state.error.message}
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<RefreshRoundedIcon />}
              onClick={this.handleReload}
            >
              Reload POS
            </Button>
          </Stack>
        </Box>
      )
    }

    return this.props.children
  }
}
