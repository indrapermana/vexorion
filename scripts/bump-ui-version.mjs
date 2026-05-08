#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const uiPackagePath = path.join(repoRoot, 'packages', 'ui', 'package.json')
const appPackagePaths = [
  path.join(repoRoot, 'VexorionERP.UI', 'package.json'),
  path.join(repoRoot, 'VexorionERP.AdminUI', 'package.json'),
  path.join(repoRoot, 'VexorionERP.POS', 'package.json'),
]

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const filteredArgs = args.filter((arg) => arg !== '--dry-run')
const input = filteredArgs[0]

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

function parseSemver(version) {
  const match = /^([0-9]+)\.([0-9]+)\.([0-9]+)$/.exec(version)
  if (!match) {
    throw new Error(`Invalid semver version: ${version}`)
  }

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
  }
}

function toSemver({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`
}

function nextVersion(current, mode) {
  if (!mode) {
    return current
  }

  if (/^[0-9]+\.[0-9]+\.[0-9]+$/.test(mode)) {
    return mode
  }

  const parsed = parseSemver(current)

  if (mode === 'patch') {
    return toSemver({ ...parsed, patch: parsed.patch + 1 })
  }

  if (mode === 'minor') {
    return toSemver({ major: parsed.major, minor: parsed.minor + 1, patch: 0 })
  }

  if (mode === 'major') {
    return toSemver({ major: parsed.major + 1, minor: 0, patch: 0 })
  }

  throw new Error(`Unknown mode: ${mode}. Use patch|minor|major|x.y.z`)
}

function updateAppDependency(filePath, version) {
  const json = readJson(filePath)
  const prev = json.dependencies?.['@vexorion/ui']

  if (!json.dependencies || typeof prev === 'undefined') {
    return { filePath, changed: false, prev: undefined, next: undefined }
  }

  if (prev === version) {
    return { filePath, changed: false, prev, next: version }
  }

  json.dependencies['@vexorion/ui'] = version

  if (!dryRun) {
    writeJson(filePath, json)
  }

  return { filePath, changed: true, prev, next: version }
}

function usage() {
  console.log('Usage: npm run ui:version -- [patch|minor|major|x.y.z] [--dry-run]')
  console.log('Examples:')
  console.log('  npm run ui:version:patch')
  console.log('  npm run ui:version -- 0.2.0')
  console.log('  npm run ui:version -- minor --dry-run')
}

try {
  const uiPkg = readJson(uiPackagePath)
  const current = uiPkg.version
  const target = nextVersion(current, input)

  if (input && current === target) {
    console.log(`@vexorion/ui is already at ${target}`)
  }

  if (!input) {
    usage()
    process.exit(0)
  }

  uiPkg.version = target

  if (!dryRun) {
    writeJson(uiPackagePath, uiPkg)
  }

  const results = appPackagePaths.map((filePath) => updateAppDependency(filePath, target))

  console.log(`[${dryRun ? 'DRY RUN' : 'APPLIED'}] @vexorion/ui ${current} -> ${target}`)
  console.log(`- ${path.relative(repoRoot, uiPackagePath)} version: ${current} -> ${target}`)

  for (const result of results) {
    const relativePath = path.relative(repoRoot, result.filePath)

    if (result.changed) {
      console.log(`- ${relativePath} dependency: ${result.prev} -> ${result.next}`)
    } else if (typeof result.prev === 'undefined') {
      console.log(`- ${relativePath} dependency: not found (skipped)`)
    } else {
      console.log(`- ${relativePath} dependency: unchanged (${result.prev})`)
    }
  }

  console.log('Next step: run npm install and npx turbo run build --filter=@vexorion/ui --filter=vexorionerp-ui --filter=vexorionerp-adminui --filter=vexorionerp-pos')
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
