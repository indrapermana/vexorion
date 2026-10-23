import { Component, type ReactNode } from 'react'
import { VxAlert, VxBox, VxButton, VxStack, VxTypography } from '@vexorion/ui'
import { RefreshRoundedIcon } from '@vexorion/ui'
import { posLogger } from '../lib/posLogger'
import { reportClientDiagnostic } from '../lib/api/core'
import { translateCurrentLocale } from '../app/I18nContext'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class PosErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  override componentDidCatch() {
    this.setState({ hasError: true })
    reportClientDiagnostic('runtime.error')
    posLogger.error('runtime.uncaughtError')
  }

  private handleReload = () => {
    window.location.reload()
  }

  override render() {
    if (this.state.hasError) {
      return (
        <VxBox
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            p: 4,
          }}
        >
          <VxStack spacing={3} sx={{ maxWidth: 520, width: '100%' }}>
            <VxAlert severity="error" role="alert" variant="filled">
              <VxTypography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {translateCurrentLocale('errorBoundary.title')}
              </VxTypography>
              <VxTypography variant="body2" sx={{ mt: 0.5 }}>
                {translateCurrentLocale('errorBoundary.message')}
              </VxTypography>
            </VxAlert>

            <VxButton
              variant="contained"
              startIcon={<RefreshRoundedIcon />}
              onClick={this.handleReload}
            >
              {translateCurrentLocale('errorBoundary.reload')}
            </VxButton>
          </VxStack>
        </VxBox>
      )
    }

    return this.props.children
  }
}
