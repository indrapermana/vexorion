import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const sourceRoot = path.resolve(import.meta.dirname, '../..')
const translatedAttributes = new Set([
  'aria-label',
  'confirmLabel',
  'consequence',
  'description',
  'emptyMessage',
  'headerName',
  'helperText',
  'label',
  'message',
  'pendingLabel',
  'placeholder',
  'title',
])

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return entry.name === 'test' ? [] : sourceFiles(entryPath)
    return entry.name.endsWith('.tsx') && !entry.name.includes('.test.') ? [entryPath] : []
  })
}

function isOperationalCopy(value: string) {
  const normalized = value.trim().replace(/\s+/g, ' ')
  return /[A-Za-z]{2}/.test(normalized) && !/^(EN|ID|ES)$/.test(normalized)
}

describe('POS localization boundary', () => {
  it('does not render hard-coded operational JSX copy', () => {
    const findings: string[] = []

    for (const file of sourceFiles(sourceRoot)) {
      const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      const record = (node: ts.Node, value: string) => {
        if (!isOperationalCopy(value)) return
        const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
        findings.push(`${path.relative(sourceRoot, file)}:${line}: ${value.trim().replace(/\s+/g, ' ')}`)
      }
      const visit = (node: ts.Node) => {
        if (ts.isJsxText(node)) record(node, node.text)
        if (
          ts.isJsxAttribute(node)
          && translatedAttributes.has(node.name.getText(source))
          && node.initializer
          && ts.isStringLiteral(node.initializer)
        ) record(node, node.initializer.text)
        ts.forEachChild(node, visit)
      }
      visit(source)
    }

    expect(findings, findings.join('\n')).toEqual([])
  })
})
