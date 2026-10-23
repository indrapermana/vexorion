import { test as base, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

function readRunCredentials() {
  return JSON.parse(readFileSync(fileURLToPath(new URL('./.auth/run.json', import.meta.url)), 'utf8')) as {
    runId: string
    tenantCode: string
    username: string
    password: string
  }
}

export const AUTH_CREDENTIALS = {
  get runId() { return readRunCredentials().runId },
  get tenantCode() { return readRunCredentials().tenantCode },
  get username() { return readRunCredentials().username },
  get password() { return readRunCredentials().password },
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
    await this.page.getByLabel(/^password/i).fill(password)
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
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a value namespaced by the generated run ID and a worker-local sequence.
 * Use for names, numbers, and codes that must not collide between runs.
 */
let uidSequence = 0
export const uid = (prefix: string) => {
  uidSequence += 1
  return `${prefix}-${AUTH_CREDENTIALS.runId}-${uidSequence}`
}

/**
 * Select an option from a MUI LookupSelectField (renders as a combobox/listbox).
 * Clicks the field, waits for the dropdown, and picks the first available option.
 */
export async function selectFirstOption(page: Page, label: string | RegExp) {
  const field = page.getByLabel(label).or(page.getByRole('combobox', { name: label })).first()
  await field.click()
  const option = page.getByRole('option').first()
  await expect(option).toBeVisible({ timeout: 5_000 })
  await option.click()
}

/**
 * Fill a MUI TextField by its label. Clears first to avoid stale text.
 */
export async function fillField(page: Page, label: string | RegExp, value: string) {
  const field = page.getByLabel(label).first()
  await field.clear()
  await field.fill(value)
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
