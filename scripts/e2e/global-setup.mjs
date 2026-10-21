import { existsSync, unlinkSync } from 'node:fs'
import {
  applicationFromConfig,
  cleanupE2ETenant,
  diagnosticsPath,
  failureMarkerPath,
  provisionE2ETenant,
  readLifecycleDiagnostics,
  readRunMetadata,
  runMetadataPath,
  shouldRetainTenant,
  writeLifecycleDiagnostics,
  writeRunMetadata,
} from './tenant-lifecycle.mjs'

export default async function globalSetup(config) {
  const { application, directory } = applicationFromConfig(config.configFile)
  const metadataPath = runMetadataPath(directory)
  const lifecycleDiagnosticsPath = diagnosticsPath(directory)
  const testFailureMarkerPath = failureMarkerPath(directory)
  const events = []
  const cleanupEnvironment = {
    E2E_ALLOW_TENANT_PROVISIONING: process.env.E2E_ALLOW_TENANT_PROVISIONING,
    E2E_API_ENVIRONMENT: process.env.E2E_API_ENVIRONMENT,
    E2E_API_BASE_URL: process.env.E2E_API_BASE_URL,
    E2E_ALLOW_REMOTE_NON_PRODUCTION: process.env.E2E_ALLOW_REMOTE_NON_PRODUCTION,
    E2E_CONTROL_TENANT_CODE: process.env.E2E_CONTROL_TENANT_CODE,
    E2E_CONTROL_USERNAME: process.env.E2E_CONTROL_USERNAME,
    E2E_CONTROL_PASSWORD: process.env.E2E_CONTROL_PASSWORD,
  }
  if (existsSync(testFailureMarkerPath)) unlinkSync(testFailureMarkerPath)

  if (existsSync(metadataPath)) {
    const interruptedRun = readRunMetadata(metadataPath)
    await cleanupE2ETenant({ run: interruptedRun })
    unlinkSync(metadataPath)
    events.push({ stage: 'orphan-cleanup', status: 'passed', tenantCode: interruptedRun.tenantCode })
  }

  let run
  try {
    run = await provisionE2ETenant({ application })
    writeRunMetadata(metadataPath, run)
    events.push({ stage: 'provision', status: 'passed', tenantCode: run.tenantCode, tenantId: run.tenantId })
    writeLifecycleDiagnostics(lifecycleDiagnosticsPath, events)
    delete process.env.E2E_CONTROL_TENANT_CODE
    delete process.env.E2E_CONTROL_USERNAME
    delete process.env.E2E_CONTROL_PASSWORD
    console.log(`Provisioned isolated automation tenant ${run.tenantCode} (${run.tenantId}).`)
  } catch (error) {
    events.push({ stage: 'provision', status: 'failed', message: error instanceof Error ? error.message : 'Unknown failure' })
    if (run) await cleanupE2ETenant({ run })
    writeLifecycleDiagnostics(lifecycleDiagnosticsPath, events)
    throw error
  }

  return async () => {
    const teardownEvents = readLifecycleDiagnostics(lifecycleDiagnosticsPath)
    if (shouldRetainTenant(process.env, existsSync(testFailureMarkerPath))) {
      writeLifecycleDiagnostics(lifecycleDiagnosticsPath, [...teardownEvents,
        { stage: 'cleanup', status: 'retained', tenantCode: run.tenantCode, tenantId: run.tenantId },
      ])
      console.log(`Retaining automation tenant ${run.tenantCode} for local debugging.`)
      return
    }

    try {
      await cleanupE2ETenant({ run, environment: cleanupEnvironment })
      unlinkSync(metadataPath)
      if (existsSync(testFailureMarkerPath)) unlinkSync(testFailureMarkerPath)
      writeLifecycleDiagnostics(lifecycleDiagnosticsPath, [...teardownEvents,
        { stage: 'cleanup', status: 'passed', tenantCode: run.tenantCode, tenantId: run.tenantId, orphanCheck: 'passed' },
      ])
      console.log(`Deleted isolated automation tenant ${run.tenantCode}; orphan check passed.`)
    } catch (error) {
      writeLifecycleDiagnostics(lifecycleDiagnosticsPath, [...teardownEvents,
        {
          stage: 'cleanup',
          status: 'failed',
          tenantCode: run.tenantCode,
          tenantId: run.tenantId,
          orphanCheck: 'failed',
          message: error instanceof Error ? error.message : 'Unknown failure',
        },
      ])
      throw error
    }
  }
}
