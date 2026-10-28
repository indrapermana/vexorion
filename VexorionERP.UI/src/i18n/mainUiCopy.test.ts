import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const mainUiModules = import.meta.glob('../{app,components,features,pages}/**/*.tsx', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>

const translatedAttributes = new Set(['aria-label', 'confirmLabel', 'consequence', 'description', 'emptyText', 'headerName', 'helperText', 'label', 'pendingLabel', 'placeholder', 'targetName', 'title'])

function isOperationalCopy(value: string) {
  const normalized = value.trim().replace(/\{\{.*?}}/g, '').replace(/\s+/g, ' ')
  return /[A-Za-z]{2}/.test(normalized) && !/^(English|Español|Bahasa Indonesia|PDF|DOCX|Pdf|Docx)$/.test(normalized)
}

function isTranslationKey(value: string) {
  return /^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$/.test(value)
}

describe('Main UI localization boundary', () => {
  it('does not render hard-coded operational JSX copy', () => {
    const findings: string[] = []

    for (const [file, contents] of Object.entries(mainUiModules)) {
      if (file.includes('.test.')) continue
      const source = ts.createSourceFile(file, contents, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      const record = (node: ts.Node, value: string) => {
        if (isTranslationKey(value) || !isOperationalCopy(value)) return
        const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
        findings.push(`${file}:${line}: ${value.trim().replace(/\s+/g, ' ')}`)
      }
      const visitRenderableStrings = (node: ts.Node) => {
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
          record(node, node.text)
          return
        }
        if (ts.isTemplateExpression(node)) {
          const text = node.head.text + node.templateSpans.map((span) => `{{value}}${span.literal.text}`).join('')
          record(node, text)
          return
        }
        if (ts.isConditionalExpression(node)) {
          visitRenderableStrings(node.whenTrue)
          visitRenderableStrings(node.whenFalse)
          return
        }
        if (ts.isBinaryExpression(node) && (node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken || node.operatorToken.kind === ts.SyntaxKind.BarBarToken)) {
          visitRenderableStrings(node.right)
        }
      }
      const visit = (node: ts.Node) => {
        if (ts.isJsxText(node)) record(node, node.text)
        if (ts.isJsxExpression(node) && node.expression && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
          visitRenderableStrings(node.expression)
        }
        if (ts.isJsxAttribute(node) && translatedAttributes.has(node.name.getText(source)) && node.initializer) {
          if (ts.isStringLiteral(node.initializer)) record(node, node.initializer.text)
          else if (ts.isJsxExpression(node.initializer) && node.initializer.expression) visitRenderableStrings(node.initializer.expression)
        }
        ts.forEachChild(node, visit)
      }
      visit(source)
    }

    expect(Object.keys(mainUiModules).length).toBeGreaterThanOrEqual(20)
    expect(findings, findings.join('\n')).toEqual([])
  }, 15_000)
})
