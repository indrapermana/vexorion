import {
  applicationFromConfig,
  diagnosticsPath,
  failureMarkerPath,
  readLifecycleDiagnostics,
  writeLifecycleDiagnostics,
} from './tenant-lifecycle.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export default class LifecycleReporter {
  diagnosticsFile
  failureMarker

  onBegin(config) {
    const { directory } = applicationFromConfig(config.configFile)
    this.diagnosticsFile = diagnosticsPath(directory)
    this.failureMarker = failureMarkerPath(directory)
  }

  onTestEnd(test, result) {
    if (result.status !== 'passed' && this.failureMarker) {
      mkdirSync(dirname(this.failureMarker), { recursive: true })
      writeFileSync(this.failureMarker, `${result.status}\n`)
    }
    if (test.parent.project()?.name !== 'setup' || test.title !== 'authenticate') return
    this.#record({
      stage: 'authentication',
      status: result.status === 'passed' ? 'passed' : 'failed',
      retry: result.retry,
    })
  }

  onEnd(result) {
    this.#record({ stage: 'test', status: result.status })
  }

  #record(event) {
    if (!this.diagnosticsFile) return
    const events = readLifecycleDiagnostics(this.diagnosticsFile)
    const withoutPriorStage = events.filter((existing) => existing.stage !== event.stage)
    writeLifecycleDiagnostics(this.diagnosticsFile, [...withoutPriorStage, event])
  }
}
