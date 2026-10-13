import { spawnSync } from 'node:child_process'

const workspaces = [
  'vexorionerp-ui',
  'vexorionerp-adminui',
  'vexorionerp-pos',
]

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const failures = []

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
