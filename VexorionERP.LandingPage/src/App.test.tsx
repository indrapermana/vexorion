import { render, screen } from '@testing-library/react'
import App from './App'

describe('landing page', () => {
  it('describes the product and links login actions to the production UI', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: /run the work/i })).toBeInTheDocument()
    expect(screen.getByText('Sales & customers')).toBeInTheDocument()

    const loginLinks = screen.getAllByRole('link', { name: /log in|open your workspace/i })
    expect(loginLinks).toHaveLength(3)
    loginLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', 'https://app.vexorionerp.com/login')
    })
  })
})
