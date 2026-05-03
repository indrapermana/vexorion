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
    await this.page.getByLabel(/username or email/i).fill(username)
    await this.page.getByLabel(/password/i).fill(password)
    await this.page.getByRole('button', { name: /sign in/i }).click()
  }
}

// ---------------------------------------------------------------------------
// Page Object: DashboardPage
// ---------------------------------------------------------------------------

export class DashboardPageObject {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/')
  }

  async waitForLoad() {
    await this.page.waitForURL('/')
    // Wait for at least one KPI card or main content area
    await this.page.waitForLoadState('networkidle')
  }
}

// ---------------------------------------------------------------------------
// Page Object: GenericCrudPage
// A lightweight helper for any list-based CRUD page.
// ---------------------------------------------------------------------------

export class GenericCrudPage {
  constructor(
    private readonly page: Page,
    private readonly route: string,
  ) {}

  async goto() {
    await this.page.goto(this.route)
    await this.page.waitForLoadState('networkidle')
  }

  async clickAdd() {
    await this.page.getByRole('button', { name: /add|new|create/i }).first().click()
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
  dashboardPage: DashboardPageObject
}

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPageObject(page))
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPageObject(page))
  },
})

export { expect }
