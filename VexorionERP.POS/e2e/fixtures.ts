import { test as base, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// ---------------------------------------------------------------------------
// Auth fixture
// ---------------------------------------------------------------------------

/**
 * Credentials used by the auth setup (auth.setup.ts).
 * Override via environment variables to avoid hardcoding credentials.
 */
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
    await this.page.getByLabel(/tenant/i).fill(tenantCode)
    await this.page.getByLabel(/username|email/i).fill(username)
    await this.page.getByLabel(/^password/i).fill(password)
    await this.page.getByRole('button', { name: /sign in|login/i }).click()
  }
}

// ---------------------------------------------------------------------------
// Page Object: PosPage
// ---------------------------------------------------------------------------

export class PosPageObject {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/')
  }

  async openShift(openingFloat: string | number = '100') {
    await this.page.waitForLoadState('networkidle')
    const dialog = this.page.getByRole('dialog', { name: /open shift/i })
    if (!(await dialog.isVisible({ timeout: 3_000 }).catch(() => false))) return
    const openingCash = dialog.getByLabel(/opening cash float/i)
    if (!(await openingCash.isVisible().catch(() => false))) return
    await openingCash.fill(String(openingFloat), { timeout: 2_000 }).catch(() => undefined)
    if (!(await dialog.isVisible().catch(() => false))) return
    await dialog.getByRole('button', { name: /open shift/i }).click({ timeout: 2_000 }).catch(() => undefined)
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })
  }

  async addProductToCart(productName?: string) {
    const addButton = productName
      ? this.page.locator('.MuiCard-root').filter({ hasText: productName }).getByRole('button', { name: /^add$/i })
      : this.page.locator('button:not(:disabled)').filter({ hasText: /^Add$/ }).first()
    await expect(addButton).toBeVisible({ timeout: 5_000 })
    await addButton.click()
  }

  async checkout(paymentAmount?: string) {
    if (paymentAmount) {
      await this.page.getByRole('spinbutton', { name: /cash received/i }).fill(paymentAmount)
    } else {
      await this.page.getByRole('button', { name: /use exact amount/i }).click()
    }
    await this.page.getByRole('button', { name: /^checkout$/i }).click()
  }

  async closeShift(countedCash: string) {
    const moreActions = this.page.getByRole('button', { name: /more register actions/i })
    if (await moreActions.isVisible().catch(() => false)) await moreActions.click()
    await this.page.getByRole('button', { name: /close shift/i }).click()
    const dialog = this.page.getByRole('dialog', { name: /close shift/i })
    await dialog.getByLabel(/counted cash/i).fill(countedCash)
    const varianceReason = dialog.getByLabel(/variance reason/i)
    if (await varianceReason.waitFor({ state: 'visible', timeout: 2_000 }).then(() => true).catch(() => false)) {
      await varianceReason.fill('E2E reconciliation')
    }
    await dialog.getByRole('button', { name: /close/i }).click()
  }
}

// ---------------------------------------------------------------------------
// Extended test fixture
// ---------------------------------------------------------------------------

type Fixtures = {
  loginPage: LoginPageObject
  posPage: PosPageObject
}

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPageObject(page))
  },
  posPage: async ({ page }, use) => {
    await use(new PosPageObject(page))
  },
})

export { expect }
