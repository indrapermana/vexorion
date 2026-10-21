import { randomBytes } from 'node:crypto'
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export const E2E_TENANT_PREFIX = 'e2e-'
export const PROTECTED_TENANT_CODES = new Set(['demo', 'vexorion', 'vexorionerp'])

const applicationDirectories = new Map([
  ['vexorionerp-ui', 'VexorionERP.UI'],
  ['vexorionerp-adminui', 'VexorionERP.AdminUI'],
  ['vexorionerp-pos', 'VexorionERP.POS'],
])

function required(environment, name) {
  const value = environment[name]?.trim()
  if (!value) throw new Error(`Missing required E2E setting: ${name}`)
  return value
}

export function validateE2ESafety(environment) {
  if (required(environment, 'E2E_ALLOW_TENANT_PROVISIONING').toLowerCase() !== 'true') {
    throw new Error('E2E tenant provisioning requires E2E_ALLOW_TENANT_PROVISIONING=true.')
  }

  const environmentName = required(environment, 'E2E_API_ENVIRONMENT').toLowerCase()
  if (!['development', 'test', 'e2e'].includes(environmentName)) {
    throw new Error('E2E_API_ENVIRONMENT must be Development, Test, or E2E.')
  }

  const apiBaseUrl = new URL(required(environment, 'E2E_API_BASE_URL'))
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(apiBaseUrl.hostname)
  if (!isLocal && environment.E2E_ALLOW_REMOTE_NON_PRODUCTION?.toLowerCase() !== 'true') {
    throw new Error('Remote E2E APIs require E2E_ALLOW_REMOTE_NON_PRODUCTION=true.')
  }
  if (/vexorionerp\.com$/iu.test(apiBaseUrl.hostname) || apiBaseUrl.hostname.endsWith('.run.app')) {
    throw new Error(`Refusing tenant lifecycle operations against protected host ${apiBaseUrl.hostname}.`)
  }

  return apiBaseUrl.toString().replace(/\/$/u, '')
}

export function shouldRetainTenant(environment, hasTestFailure) {
  return hasTestFailure
    && !environment.CI
    && environment.E2E_RETAIN_TENANT_ON_FAILURE?.toLowerCase() === 'true'
}

export function createRunIdentity(application, environment, random = randomBytes) {
  const applicationSlug = application.replace(/^vexorionerp-/u, '').replace(/[^a-z0-9]/gu, '').slice(0, 8) || 'app'
  const runSeed = (environment.GITHUB_RUN_ID || environment.E2E_RUN_ID || Date.now().toString())
    .replace(/[^a-zA-Z0-9]/gu, '')
    .slice(-12)
    .toLowerCase()
  const suffix = random(4).toString('hex')
  const prefix = `${E2E_TENANT_PREFIX}${applicationSlug}-${runSeed}-${suffix}`.slice(0, 44)

  return {
    runId: `${runSeed}-${suffix}`,
    prefix,
    tenantCode: prefix,
    tenantName: `E2E ${applicationSlug} ${runSeed} ${suffix}`,
    companyCode: `E2E${suffix}`.toUpperCase(),
    companyName: `E2E Company ${suffix}`,
    adminUserName: `e2e-admin-${suffix}`,
    adminEmail: `e2e-admin-${suffix}@example.invalid`,
    adminPassword: `E2e!${random(18).toString('base64url')}9a`,
  }
}

async function requestJson(fetchImpl, url, options, operation, attempts = 3) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, options)
      const text = await response.text()
      const body = text ? JSON.parse(text) : null
      if (!response.ok) throw new Error(`${operation} returned HTTP ${response.status}.`)
      return body
    } catch (error) {
      lastError = error
      if (attempt < attempts) await new Promise((done) => setTimeout(done, attempt * 250))
    }
  }
  throw new Error(`${operation} failed after ${attempts} attempts: ${lastError instanceof Error ? lastError.message : 'unknown error'}`)
}

async function loginControlPlane(fetchImpl, apiBaseUrl, environment) {
  const session = await requestJson(fetchImpl, `${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantCode: required(environment, 'E2E_CONTROL_TENANT_CODE'),
      userNameOrEmail: required(environment, 'E2E_CONTROL_USERNAME'),
      password: required(environment, 'E2E_CONTROL_PASSWORD'),
    }),
  }, 'Control-plane login')

  const headers = { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' }
  const currentUser = await requestJson(fetchImpl, `${apiBaseUrl}/auth/me`, { headers }, 'Control-plane identity check')
  if (!currentUser.roles?.includes('SystemAdmin')) {
    throw new Error('E2E control-plane account must have the SystemAdmin role.')
  }
  return headers
}

export async function provisionE2ETenant({ application, environment = process.env, fetchImpl = fetch, random }) {
  const apiBaseUrl = validateE2ESafety(environment)
  const identity = createRunIdentity(application, environment, random)
  const headers = await loginControlPlane(fetchImpl, apiBaseUrl, environment)
  const tenant = await requestJson(fetchImpl, `${apiBaseUrl}/tenants/onboard`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      tenantName: identity.tenantName,
      tenantCode: identity.tenantCode,
      domain: null,
      companyName: identity.companyName,
      companyCode: identity.companyCode,
      adminUserName: identity.adminUserName,
      adminEmail: identity.adminEmail,
      adminPassword: identity.adminPassword,
      firstName: 'E2E',
      lastName: 'Administrator',
    }),
  }, 'Automation tenant provisioning')

  return {
    version: 1,
    application,
    apiBaseUrl,
    runId: identity.runId,
    prefix: identity.prefix,
    tenantId: tenant.tenantId,
    companyId: tenant.companyId,
    adminUserId: tenant.adminUserId,
    tenantCode: tenant.tenantCode,
    username: identity.adminUserName,
    password: identity.adminPassword,
    createdAtUtc: new Date().toISOString(),
  }
}

export async function cleanupE2ETenant({ run, environment = process.env, fetchImpl = fetch }) {
  const apiBaseUrl = validateE2ESafety(environment)
  if (run.apiBaseUrl !== apiBaseUrl) throw new Error('Run metadata API URL does not match the cleanup API URL.')
  if (!run.tenantCode.startsWith(E2E_TENANT_PREFIX) || !run.tenantCode.startsWith(run.prefix)) {
    throw new Error(`Refusing to delete tenant with invalid E2E identity: ${run.tenantCode}`)
  }
  if (PROTECTED_TENANT_CODES.has(run.tenantCode.toLowerCase())) {
    throw new Error(`Refusing to delete protected tenant ${run.tenantCode}.`)
  }

  const headers = await loginControlPlane(fetchImpl, apiBaseUrl, environment)
  const tenants = await requestJson(fetchImpl, `${apiBaseUrl}/tenants`, { headers }, 'Tenant cleanup identity check')
  const matchingTenant = tenants.find((tenant) => tenant.id === run.tenantId)
  const runTenants = tenants.filter((tenant) => tenant.code.startsWith(run.prefix))
  if (!matchingTenant && runTenants.length === 0) return { alreadyDeleted: true }
  if (!matchingTenant) throw new Error('Primary run tenant is missing while prefixed child tenants remain.')
  if (matchingTenant.code !== run.tenantCode || !matchingTenant.code.startsWith(run.prefix)) {
    throw new Error('Tenant ID/code verification failed; cleanup was refused.')
  }

  for (const tenant of [...runTenants].sort((tenant) => tenant.id === run.tenantId ? 1 : -1)) {
    if (PROTECTED_TENANT_CODES.has(tenant.code.toLowerCase()) || !tenant.code.startsWith(run.prefix)) {
      throw new Error(`Refusing to delete invalid run tenant ${tenant.code}.`)
    }
    await requestJson(fetchImpl, `${apiBaseUrl}/tenants/${tenant.id}`, {
      method: 'DELETE',
      headers,
    }, `Automation tenant cleanup (${tenant.code})`)
  }

  const remaining = await requestJson(fetchImpl, `${apiBaseUrl}/tenants`, { headers }, 'Tenant orphan check')
  if (remaining.some((tenant) => tenant.id === run.tenantId || tenant.code.startsWith(run.prefix))) {
    throw new Error(`Automation tenant records with prefix ${run.prefix} remain after cleanup.`)
  }
  return { alreadyDeleted: false }
}

export function applicationFromConfig(configFile) {
  for (const [application, directory] of applicationDirectories) {
    if (configFile.includes(`/${directory}/`)) {
      return { application, directory: dirname(resolve(configFile)) }
    }
  }
  throw new Error(`Unable to identify E2E application from ${configFile}.`)
}

export function runMetadataPath(directory) {
  return resolve(directory, 'e2e', '.auth', 'run.json')
}

export function diagnosticsPath(directory) {
  return resolve(directory, 'test-results', 'e2e-tenant-lifecycle.json')
}

export function failureMarkerPath(directory) {
  return resolve(directory, 'test-results', 'e2e-tenant-failed')
}

export function writeRunMetadata(filePath, run) {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(run, null, 2)}\n`, { mode: 0o600 })
  chmodSync(filePath, 0o600)
}

export function readRunMetadata(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

export function writeLifecycleDiagnostics(filePath, events) {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify({ events }, null, 2)}\n`)
}

export function readLifecycleDiagnostics(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')).events ?? []
  } catch {
    return []
  }
}
