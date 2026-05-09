import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const packageRoot = path.resolve(__dirname, '..')
const componentsRoot = path.join(packageRoot, 'src', 'components')

const folders = {
  charts: {
    wrappers: [
      {
        file: 'VxBarChart.tsx',
        content: [
          "import { BarChart } from '@mui/x-charts'",
          "import type { BarChartProps } from '@mui/x-charts'",
          '',
          'export function VxBarChart(props: BarChartProps) {',
          '  return <BarChart {...props} />',
          '}',
          '',
        ].join('\n'),
      },
      {
        file: 'VxLineChart.tsx',
        content: [
          "import { LineChart } from '@mui/x-charts'",
          "import type { LineChartProps } from '@mui/x-charts'",
          '',
          'export function VxLineChart(props: LineChartProps) {',
          '  return <LineChart {...props} />',
          '}',
          '',
        ].join('\n'),
      },
    ],
  },
  datagrid: {
    wrappers: [
      {
        file: 'VxDataGrid.tsx',
        content: [
          "import { DataGrid } from '@mui/x-data-grid'",
          "import type { DataGridProps } from '@mui/x-data-grid'",
          '',
          'export function VxDataGrid(props: DataGridProps) {',
          '  return <DataGrid {...props} />',
          '}',
          '',
        ].join('\n'),
      },
      {
        file: 'VxGridActionsCellItem.ts',
        content: "export { GridActionsCellItem as VxGridActionsCellItem } from '@mui/x-data-grid'\n",
      },
      {
        file: 'VxGridColDef.ts',
        content: "export type { GridColDef as VxGridColDef } from '@mui/x-data-grid'\n",
      },
    ],
  },
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function writeStable(filePath, content) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null
  if (existing !== content) {
    fs.writeFileSync(filePath, content)
  }
}

function writeFolderBarrel(folderPath) {
  const files = fs
    .readdirSync(folderPath)
    .filter((name) => name !== 'index.ts')
    .filter((name) => name.endsWith('.ts') || name.endsWith('.tsx'))
    .sort((a, b) => a.localeCompare(b))

  const exports = files.map((name) => `export * from './${name.replace(/\.(ts|tsx)$/u, '')}'`)
  const barrel = `${exports.join('\n')}\n`
  writeStable(path.join(folderPath, 'index.ts'), barrel)

  return files.length
}

for (const [folderName, spec] of Object.entries(folders)) {
  const folderPath = path.join(componentsRoot, folderName)
  ensureDir(folderPath)

  for (const wrapper of spec.wrappers) {
    writeStable(path.join(folderPath, wrapper.file), wrapper.content)
  }

  const count = writeFolderBarrel(folderPath)
  console.log(`Updated ${folderName} aliases: ${count} file exports`) // eslint-disable-line no-console
}

const materialPath = path.join(componentsRoot, 'material')
if (fs.existsSync(materialPath)) {
  const count = writeFolderBarrel(materialPath)
  console.log(`Updated material aliases: ${count} file exports`) // eslint-disable-line no-console
}
