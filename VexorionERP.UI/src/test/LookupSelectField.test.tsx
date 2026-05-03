/// <reference types="vitest/globals" />

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LookupSelectField from '../components/LookupSelectField'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const options = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
]

describe('LookupSelectField', () => {
  it('renders the label and available options', () => {
    render(
      <LookupSelectField
        label="Category"
        value=""
        onChange={vi.fn()}
        options={options}
      />,
    )
    expect(screen.getByLabelText('Category')).toBeInTheDocument()
  })

  it('shows "Required" helper text when options are present', () => {
    render(
      <LookupSelectField
        label="Category"
        value=""
        onChange={vi.fn()}
        options={options}
      />,
    )
    expect(screen.getByText('Required')).toBeInTheDocument()
  })

  it('shows custom emptyText when no options are available', () => {
    render(
      <LookupSelectField
        label="Category"
        value=""
        onChange={vi.fn()}
        options={[]}
        emptyText="No categories found"
      />,
    )
    expect(screen.getByText('No categories found')).toBeInTheDocument()
  })

  it('shows default emptyText when options are empty and emptyText not set', () => {
    render(
      <LookupSelectField
        label="Category"
        value=""
        onChange={vi.fn()}
        options={[]}
      />,
    )
    expect(screen.getByText('No options available')).toBeInTheDocument()
  })

  it('shows custom helperText when provided', () => {
    render(
      <LookupSelectField
        label="Category"
        value=""
        onChange={vi.fn()}
        options={options}
        helperText="Select a category"
      />,
    )
    expect(screen.getByText('Select a category')).toBeInTheDocument()
  })

  it('renders as disabled when disabled prop is true', () => {
    render(
      <LookupSelectField
        label="Category"
        value=""
        onChange={vi.fn()}
        options={options}
        disabled
      />,
    )
    // MUI Select renders a div with aria-disabled rather than the HTML disabled attribute
    const input = screen.getByRole('combobox')
    expect(input).toHaveAttribute('aria-disabled', 'true')
  })

  it('calls onChange when a menu item is selected', async () => {
    const handleChange = vi.fn()
    render(
      <LookupSelectField
        label="Category"
        value=""
        onChange={handleChange}
        options={options}
      />,
    )
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByText('Option A'))
    expect(handleChange).toHaveBeenCalledWith('a')
  })
})
