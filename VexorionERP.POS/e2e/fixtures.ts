import { test as base, expect, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Auth fixture
// ---------------------------------------------------------------------------

/**
 * Credentials used by the auth setup (auth.setup.ts).
 * Override via environment variables to avoid hardcoding credentials.
 */
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
    await this.page.getByLabel(/tenant/i).fill(tenantCode)
    await this.page.getByLabel(/username|email/i).fill(username)
    await this.page.getByLabel(/password/i).fill(password)
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

  async openShift(openingFloat = '100') {
    const openBtn = this.page.getByRole('button', { name: /open shift/i })
    await openBtn.click()
    const dialog = this.page.getByRole('dialog')
    await dialog.getByRole('spinbutton').fill(openingFloat)
    await dialog.getByRole('button', { name: /open/i }).click()
  }

  async addProductToCart(productName: string) {
    const productCard = this.page.getByText(productName).first()
    await productCard.click()
  }

  async checkout(paymentAmount: string) {
    await this.page.getByRole('button', { name: /checkout/i }).click()
    const dialog = this.page.getByRole('dialog')
    const amountField = dialog.getByRole('spinbutton')
    await amountField.clear()
    await amountField.fill(paymentAmount)
    await dialog.getByRole('button', { name: /confirm|complete/i }).click()
  }

  async closeShift(countedCash: string) {
    await this.page.getByRole('button', { name: /close shift/i }).click()
    const dialog = this.page.getByRole('dialog')
    await dialog.getByRole('spinbutton').fill(countedCash)
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
