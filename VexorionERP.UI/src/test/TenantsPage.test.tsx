/// <reference types="vitest/globals" />

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TenantsPage from '../pages/TenantsPage'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('TenantsPage', () => {
  it('starts public registration without demo organization or credential values', () => {
    render(
      <MemoryRouter>
        <TenantsPage />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('pages.auth.tenants.fields.tenantName')).toHaveValue('')
    expect(screen.getByLabelText('pages.auth.tenants.fields.tenantCode')).toHaveValue('')
    expect(screen.getByLabelText('pages.auth.tenants.fields.adminUserName')).toHaveValue('')
    expect(screen.getByLabelText('pages.auth.tenants.fields.adminEmail')).toHaveValue('')
    expect(screen.getByLabelText('pages.auth.tenants.fields.adminPassword', { selector: 'input' })).toHaveValue('')
  })
})
