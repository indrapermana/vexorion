import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const inventoryModules = import.meta.glob('../features/{inventoryAdjustments,stockCounts,stockTransfers}/**/*.tsx', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>

const translatedAttributes = new Set(['aria-label', 'confirmLabel', 'consequence', 'headerName', 'helperText', 'label', 'pendingLabel', 'placeholder', 'targetName', 'title'])

function isOperationalCopy(value: string) {
  const normalized = value.trim().replace(/\s+/g, ' ')
  return /[A-Za-z]{2}/.test(normalized) && !/^(English|Español|Bahasa Indonesia)$/.test(normalized)
}

describe('inventory localization boundary', () => {
  it('does not render hard-coded operational JSX copy in inventory pages', () => {
    const findings: string[] = []

    for (const [file, contents] of Object.entries(inventoryModules)) {
      if (file.includes('.test.')) continue
      const source = ts.createSourceFile(file, contents, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      const record = (node: ts.Node, value: string) => {
        if (!isOperationalCopy(value)) return
        const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
        findings.push(`${file}:${line}: ${value.trim().replace(/\s+/g, ' ')}`)
      }
      const visit = (node: ts.Node) => {
        if (ts.isJsxText(node)) record(node, node.text)
        if (ts.isJsxAttribute(node) && translatedAttributes.has(node.name.getText(source)) && node.initializer && ts.isStringLiteral(node.initializer)) {
          record(node, node.initializer.text)
        }
        ts.forEachChild(node, visit)
      }
      visit(source)
    }

    expect(Object.keys(inventoryModules).length).toBeGreaterThanOrEqual(3)
    expect(findings, findings.join('\n')).toEqual([])
  })
})
