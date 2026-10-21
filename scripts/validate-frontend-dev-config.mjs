import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveConfig } from 'vite'

const expectedApiBaseUrl = '/api'
const expectedProxyTarget = 'https://localhost:7171'
const applications = [
  'VexorionERP.UI',
  'VexorionERP.AdminUI',
  'VexorionERP.POS',
]

function readEnvironment(filePath) {
  return Object.fromEntries(
    readFileSync(filePath, 'utf8')
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=')
        if (separator < 1) throw new Error(`Invalid environment entry in ${filePath}: ${line}`)
        return [line.slice(0, separator), line.slice(separator + 1)]
      }),
  )
}

for (const application of applications) {
  const root = resolve(application)
  const developmentEnvironment = readEnvironment(resolve(root, '.env.development'))
  const exampleEnvironment = readEnvironment(resolve(root, '.env.example'))

  for (const [name, environment] of [
    ['.env.development', developmentEnvironment],
    ['.env.example', exampleEnvironment],
  ]) {
    if (environment.VITE_API_BASE_URL !== expectedApiBaseUrl) {
      throw new Error(`${application}/${name} must set VITE_API_BASE_URL=${expectedApiBaseUrl}`)
    }
    if (environment.VITE_API_PROXY_TARGET !== expectedProxyTarget) {
      throw new Error(`${application}/${name} must set VITE_API_PROXY_TARGET=${expectedProxyTarget}`)
    }
  }

  const config = await resolveConfig(
    { root, configFile: resolve(root, 'vite.config.ts'), mode: 'development' },
    'serve',
  )
  const proxy = config.server.proxy?.['/api']

  if (typeof proxy !== 'object' || Array.isArray(proxy)) {
    throw new Error(`${application} must define a Vite /api proxy`)
  }
  if (proxy.target !== expectedProxyTarget || proxy.changeOrigin !== true || proxy.secure !== false) {
    throw new Error(
      `${application} /api proxy must target ${expectedProxyTarget} with changeOrigin=true and secure=false`,
    )
  }

  console.log(`PASS ${application}: ${expectedApiBaseUrl} -> ${expectedProxyTarget}`)
}
