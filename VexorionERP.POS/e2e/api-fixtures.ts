import { request as playwrightRequest, type APIResponse } from '@playwright/test'
import { AUTH_CREDENTIALS } from './fixtures'

export type JsonObject = Record<string, unknown>
export type RunApiRequest = <T>(method: 'GET' | 'POST' | 'PUT', path: string, data?: JsonObject) => Promise<T>

async function readJson<T>(response: APIResponse, operation: string): Promise<T> {
  if (!response.ok()) {
    throw new Error(`${operation} failed with HTTP ${response.status()}: ${await response.text()}`)
  }
  return response.json() as Promise<T>
}

export async function createRunApiContext() {
  const apiBaseUrl = process.env.E2E_API_BASE_URL?.replace(/\/$/u, '')
  if (!apiBaseUrl) throw new Error('E2E_API_BASE_URL is required for the POS integration scenarios.')

  const anonymous = await playwrightRequest.newContext()
  try {
    const loginResponse = await anonymous.post(`${apiBaseUrl}/auth/login`, {
      data: {
        tenantCode: AUTH_CREDENTIALS.tenantCode,
        userNameOrEmail: AUTH_CREDENTIALS.username,
        password: AUTH_CREDENTIALS.password,
      },
    })
    const session = await readJson<{ accessToken: string }>(loginResponse, 'POS test-user login')
    const api = await playwrightRequest.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${session.accessToken}` },
    })
    const currentUser = await readJson<{ permissions: string[] }>(
      await api.get(`${apiBaseUrl}/auth/me`),
      'POS test-user permission check',
    )
    const requiredPermissions = [
      'customers.manage',
      'customers.view',
      'inventory.manage',
      'inventory.view',
      'pos.checkout',
      'pos.refund',
      'products.manage',
      'products.view',
      'sales.view',
    ]
    const missingPermissions = requiredPermissions.filter((permission) => !currentUser.permissions.includes(permission))
    if (missingPermissions.length > 0) {
      await api.dispose()
      throw new Error(`Generated E2E tenant administrator is missing required permissions: ${missingPermissions.join(', ')}.`)
    }

    const requestJson = async <T>(method: 'GET' | 'POST' | 'PUT', path: string, data?: JsonObject): Promise<T> => {
      const response = await api.fetch(`${apiBaseUrl}${path}`, { method, data })
      return readJson<T>(response, `POS E2E fixture ${method} ${path}`)
    }

    return { api, requestJson }
  } finally {
    await anonymous.dispose()
  }
}

export async function postInventoryAdjustment(
  requestJson: RunApiRequest,
  suffix: string,
  warehouseId: string,
  productId: string,
  quantityDelta: number,
) {
  const adjustmentNumber = `POS-E2E-${suffix}-${quantityDelta > 0 ? 'IN' : 'OUT'}`
  const adjustmentDate = new Date().toISOString().slice(0, 10)
  const adjustment = await requestJson<{ id: string }>('POST', '/inventory-adjustments', {
    adjustmentNumber,
    warehouseId,
    adjustmentDate,
    reason: `POS E2E fixture ${suffix}`,
  })
  await requestJson('POST', `/inventory-adjustments/${adjustment.id}/lines`, {
    productId,
    quantityDelta,
    unitCost: 5,
    reason: `POS E2E fixture ${suffix}`,
  })
  await requestJson('PUT', `/inventory-adjustments/${adjustment.id}`, {
    adjustmentNumber,
    warehouseId,
    adjustmentDate,
    status: 4,
    reason: `POS E2E fixture ${suffix}`,
  })
}

export async function seedPosCatalog(requestJson: RunApiRequest, suffix: string, openingStock = 5) {
  const customer = await requestJson<{ id: string }>('POST', '/customers', {
    customerNumber: `POS-E2E-${suffix}`,
    name: `POS E2E Customer ${suffix}`,
  })
  const warehouse = await requestJson<{ id: string; name: string }>('POST', '/warehouses', {
    code: `P${suffix}`,
    name: `POS E2E Warehouse ${suffix}`,
  })
  const product = await requestJson<{ id: string; name: string }>('POST', '/products', {
    sku: `POS-E2E-${suffix}`,
    name: `POS E2E Product ${suffix}`,
    unitOfMeasure: 'EA',
    standardCost: 5,
    salesPrice: 10,
    reorderLevel: 0,
  })
  await postInventoryAdjustment(requestJson, `${suffix}-OPEN`, warehouse.id, product.id, openingStock)
  return { customer, warehouse, product }
}
