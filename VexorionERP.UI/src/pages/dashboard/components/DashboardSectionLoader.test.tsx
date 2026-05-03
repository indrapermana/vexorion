/// <reference types="vitest/globals" />

import { render, screen } from '@testing-library/react'
import DashboardSectionLoader from './DashboardSectionLoader'

describe('DashboardSectionLoader', () => {
  it('renders skeleton elements', () => {
    render(<DashboardSectionLoader />)
    // MUI Skeleton renders with role="img" by default (or just as a span)
    // The easiest check is that the component mounts without error
    expect(document.querySelector('.MuiSkeleton-root')).toBeInTheDocument()
  })

  it('accepts a custom minHeight prop without crashing', () => {
    const { container } = render(<DashboardSectionLoader minHeight={400} />)
    expect(container.firstChild).toBeTruthy()
  })
})
