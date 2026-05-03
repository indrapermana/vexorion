import { test as base, expect, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

export const AUTH_CREDENTIALS = {
  tenantCode: process.env.E2E_TENANT_CODE ?? 'demo',
  username: process.env.E2E_USERNAME ?? 'admin@demo.local',
  password: process.env.E2E_PASSWORD ?? 'DemoAdmin123!',
}

// ---------------------------------------------------------------------------
// Page Object: LoginPage
// ---------------------------------------------------------------------------

export class LoginPageObject {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/login')
  }

  async login(tenantCode: string, username: string, password: string) {
    await this.page.getByLabel(/tenant code/i).fill(tenantCode)
    await this.page.getByLabel(/email or username/i).fill(username)
    await this.page.getByLabel(/password/i).fill(password)
    await this.page.getByRole('button', { name: /sign in/i }).click()
  }
}

// ---------------------------------------------------------------------------
// Page Object: TenantsPage
// ---------------------------------------------------------------------------

export class TenantsPageObject {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/tenants')
    await this.page.waitForLoadState('networkidle')
  }

  async clickAdd() {
    await this.page.getByRole('button', { name: /add|new|create/i }).first().click()
  }

  async fillTenantForm(name: string, code: string) {
    const dialog = this.page.getByRole('dialog')
    const nameField = dialog.getByLabel(/name/i).first()
    const codeField = dialog.getByLabel(/code|slug/i).first()
    await nameField.fill(name)
    if (await codeField.isVisible()) {
      await codeField.fill(code)
    }
  }

  async saveDialog() {
    const dialog = this.page.getByRole('dialog')
    await dialog.getByRole('button', { name: /save|create|add/i }).last().click()
  }

  async closeDialog() {
    const dialog = this.page.getByRole('dialog')
    await dialog.getByRole('button', { name: /cancel|close/i }).first().click()
  }
}

// ---------------------------------------------------------------------------
// Extended fixture
// ---------------------------------------------------------------------------

type Fixtures = {
  loginPage: LoginPageObject
  tenantsPage: TenantsPageObject
}

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPageObject(page))
  },
  tenantsPage: async ({ page }, use) => {
    await use(new TenantsPageObject(page))
  },
})

export { expect }
