import { gzipSync } from 'node:zlib'
import { readFile, readdir } from 'node:fs/promises'
import { basename } from 'node:path'

const kib = 1024
const budgets = {
  chunkRaw: 450 * kib,
  chunkGzip: 140 * kib,
  entryRaw: 400 * kib,
  entryGzip: 110 * kib,
}

const distDirectory = new URL('../dist/', import.meta.url)
const assetsDirectory = new URL('./assets/', distDirectory)

const formatKib = (bytes) => `${(bytes / kib).toFixed(2)} KiB`

let indexHtml
let assetNames
try {
  indexHtml = await readFile(new URL('./index.html', distDirectory), 'utf8')
  assetNames = (await readdir(assetsDirectory)).filter((name) => name.endsWith('.js'))
} catch (error) {
  console.error('Bundle budget requires a completed VexorionERP.UI production build in dist/.')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}

const entryMatch = indexHtml.match(/<script[^>]+src="\/assets\/([^"]+\.js)"/)
if (!entryMatch) {
  console.error('Unable to identify the production entry script from dist/index.html.')
  process.exit(1)
}

const entryName = entryMatch[1]
const measurements = await Promise.all(assetNames.map(async (name) => {
  const content = await readFile(new URL(`./${name}`, assetsDirectory))
  return {
    name,
    raw: content.byteLength,
    gzip: gzipSync(content).byteLength,
  }
}))

const violations = []
for (const measurement of measurements) {
  if (measurement.raw > budgets.chunkRaw) {
    violations.push(`${measurement.name} raw size ${formatKib(measurement.raw)} exceeds ${formatKib(budgets.chunkRaw)}`)
  }
  if (measurement.gzip > budgets.chunkGzip) {
    violations.push(`${measurement.name} gzip size ${formatKib(measurement.gzip)} exceeds ${formatKib(budgets.chunkGzip)}`)
  }
}

const entry = measurements.find((measurement) => measurement.name === basename(entryName))
if (!entry) {
  violations.push(`Entry script ${entryName} was not found in dist/assets.`)
} else {
  if (entry.raw > budgets.entryRaw) {
    violations.push(`Entry ${entry.name} raw size ${formatKib(entry.raw)} exceeds ${formatKib(budgets.entryRaw)}`)
  }
  if (entry.gzip > budgets.entryGzip) {
    violations.push(`Entry ${entry.name} gzip size ${formatKib(entry.gzip)} exceeds ${formatKib(budgets.entryGzip)}`)
  }
}

const largestRaw = measurements.toSorted((left, right) => right.raw - left.raw)[0]
const largestGzip = measurements.toSorted((left, right) => right.gzip - left.gzip)[0]

console.log(`Bundle entry: ${entry?.name ?? entryName} (${entry ? `${formatKib(entry.raw)} raw, ${formatKib(entry.gzip)} gzip` : 'missing'})`)
console.log(`Largest raw chunk: ${largestRaw.name} (${formatKib(largestRaw.raw)})`)
console.log(`Largest gzip chunk: ${largestGzip.name} (${formatKib(largestGzip.gzip)})`)

if (violations.length > 0) {
  console.error('\nMain UI bundle budget failed:')
  for (const violation of violations) console.error(`- ${violation}`)
  process.exit(1)
}

console.log('Main UI bundle budget passed.')
