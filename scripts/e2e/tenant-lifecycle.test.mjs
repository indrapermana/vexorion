import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applicationFromConfig,
  cleanupE2ETenant,
  createRunIdentity,
  provisionE2ETenant,
  shouldRetainTenant,
  validateE2ESafety,
} from './tenant-lifecycle.mjs'

const baseEnvironment = {
  E2E_ALLOW_TENANT_PROVISIONING: 'true',
  E2E_API_ENVIRONMENT: 'Test',
  E2E_API_BASE_URL: 'http://localhost:5000/api',
  E2E_CONTROL_TENANT_CODE: 'control',
  E2E_CONTROL_USERNAME: 'system-admin',
  E2E_CONTROL_PASSWORD: 'not-a-real-secret',
  E2E_RUN_ID: '12345',
}

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body === null ? '' : JSON.stringify(body),
  }
}

function deterministicRandom(value) {
  return (size) => Buffer.alloc(size, value)
}

test('safety checks reject production and unapproved remote APIs', () => {
  assert.throws(() => validateE2ESafety({ ...baseEnvironment, E2E_API_ENVIRONMENT: 'Production' }), /Development, Test, or E2E/u)
  assert.throws(() => validateE2ESafety({ ...baseEnvironment, E2E_API_BASE_URL: 'https://staging.example.test/api' }), /E2E_ALLOW_REMOTE_NON_PRODUCTION/u)
  assert.throws(() => validateE2ESafety({
    ...baseEnvironment,
    E2E_API_BASE_URL: 'https://api.vexorionerp.com/api',
    E2E_ALLOW_REMOTE_NON_PRODUCTION: 'true',
  }), /protected host/u)
})

test('parallel run identities are prefixed and collision-safe', () => {
  const first = createRunIdentity('vexorionerp-ui', baseEnvironment, deterministicRandom(1))
  const second = createRunIdentity('vexorionerp-ui', baseEnvironment, deterministicRandom(2))
  assert.match(first.tenantCode, /^e2e-ui-/u)
  assert.notEqual(first.tenantCode, second.tenantCode)
  assert.ok(first.tenantCode.length <= 44)
})

test('application paths resolve from the Playwright config instead of the process working directory', () => {
  assert.deepEqual(
    applicationFromConfig('/workspace/VexorionERP.UI/playwright.config.ts'),
    { application: 'vexorionerp-ui', directory: '/workspace/VexorionERP.UI' },
  )
})

test('tenant retention is local, explicit, and limited to failed runs', () => {
  assert.equal(shouldRetainTenant({ E2E_RETAIN_TENANT_ON_FAILURE: 'true' }, true), true)
  assert.equal(shouldRetainTenant({ E2E_RETAIN_TENANT_ON_FAILURE: 'true' }, false), false)
  assert.equal(shouldRetainTenant({ E2E_RETAIN_TENANT_ON_FAILURE: 'false' }, true), false)
  assert.equal(shouldRetainTenant({ E2E_RETAIN_TENANT_ON_FAILURE: 'true', CI: 'true' }, true), false)
})

test('provisioning retries transient failures without exposing control credentials', async () => {
  let loginAttempts = 0
  const calls = []
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options })
    if (url.endsWith('/auth/login')) {
      loginAttempts += 1
      return loginAttempts === 1 ? response(503, { title: 'Unavailable' }) : response(200, { accessToken: 'control-token' })
    }
    if (url.endsWith('/auth/me')) return response(200, { roles: ['SystemAdmin'] })
    if (url.endsWith('/tenants/onboard')) return response(200, {
      tenantId: 'tenant-1', companyId: 'company-1', adminUserId: 'user-1', tenantCode: 'e2e-ui-12345-01010101',
    })
    throw new Error(`Unexpected URL ${url}`)
  }

  const run = await provisionE2ETenant({
    application: 'vexorionerp-ui',
    environment: baseEnvironment,
    fetchImpl,
    random: deterministicRandom(1),
  })

  assert.equal(loginAttempts, 2)
  assert.equal(run.tenantId, 'tenant-1')
  assert.equal(JSON.stringify(run).includes(baseEnvironment.E2E_CONTROL_PASSWORD), false)
  assert.equal(calls.some(({ options }) => options.headers?.Authorization === 'Bearer control-token'), true)
})

test('cleanup verifies tenant identity, deletes once, and detects no orphan', async () => {
  const run = {
    apiBaseUrl: 'http://localhost:5000/api',
    prefix: 'e2e-ui-12345-01010101',
    tenantCode: 'e2e-ui-12345-01010101',
    tenantId: 'tenant-1',
  }
  let deleted = false
  const fetchImpl = async (url, options = {}) => {
    if (url.endsWith('/auth/login')) return response(200, { accessToken: 'control-token' })
    if (url.endsWith('/auth/me')) return response(200, { roles: ['SystemAdmin'] })
    if (url.endsWith('/tenants/tenant-1') && options.method === 'DELETE') {
      deleted = true
      return response(204, null)
    }
    if (url.endsWith('/tenants')) {
      return response(200, deleted ? [] : [{ id: 'tenant-1', code: run.tenantCode }])
    }
    throw new Error(`Unexpected URL ${url}`)
  }

  assert.deepEqual(await cleanupE2ETenant({ run, environment: baseEnvironment, fetchImpl }), { alreadyDeleted: false })
  assert.deepEqual(await cleanupE2ETenant({ run, environment: baseEnvironment, fetchImpl }), { alreadyDeleted: true })
})

test('cleanup refuses a mismatched tenant ID and code', async () => {
  const run = {
    apiBaseUrl: 'http://localhost:5000/api',
    prefix: 'e2e-ui-12345-01010101',
    tenantCode: 'e2e-ui-12345-01010101',
    tenantId: 'tenant-1',
  }
  const fetchImpl = async (url) => {
    if (url.endsWith('/auth/login')) return response(200, { accessToken: 'control-token' })
    if (url.endsWith('/auth/me')) return response(200, { roles: ['SystemAdmin'] })
    if (url.endsWith('/tenants')) return response(200, [{ id: 'tenant-1', code: 'vexorionerp' }])
    throw new Error(`Unexpected URL ${url}`)
  }

  await assert.rejects(cleanupE2ETenant({ run, environment: baseEnvironment, fetchImpl }), /verification failed/u)
})
