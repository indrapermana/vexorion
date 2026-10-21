import { spawnSync } from 'node:child_process'

const workspaces = [
  'vexorionerp-ui',
  'vexorionerp-adminui',
  'vexorionerp-pos',
]

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const failures = []

console.log('\n=== Validating frontend development API routing ===')
const configResult = spawnSync(
  process.execPath,
  ['scripts/validate-frontend-dev-config.mjs'],
  { stdio: 'inherit' },
)

if (configResult.status !== 0) {
  console.error('\nFrontend development API routing validation failed.')
  process.exit(configResult.status ?? 1)
}

for (const workspace of workspaces) {
  console.log(`\n=== Running frontend tests: ${workspace} ===`)
  const result = spawnSync(
    npmCommand,
    ['run', 'test:run', '--workspace', workspace],
    { stdio: 'inherit' },
  )

  if (result.status !== 0) failures.push(workspace)
}

if (failures.length > 0) {
  console.error(`\nFrontend test failures: ${failures.join(', ')}`)
  process.exitCode = 1
} else {
  console.log('\nAll frontend workspace tests passed.')
}
