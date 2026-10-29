import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(resolve(process.cwd(), 'src/features/projects', path), 'utf8')

describe('project component boundaries', () => {
  it('keeps project-list orchestration separate from grid rendering', () => {
    const page = source('pages/ProjectsPage.tsx')
    const grid = source('components/ProjectsDataGrid.tsx')

    expect(page).toContain('<ProjectsDataGrid')
    expect(page).not.toContain('<VxDataGrid')
    expect(grid).toContain('preferenceKey="projects"')
    expect(grid).toContain('canManage ?')
  })

  it('delegates project detail tabs, party rows, and history rows', () => {
    const page = source('pages/ProjectDetailsPage.tsx')

    expect(page).toContain('<ProjectTabPanel')
    expect(page).toContain('<ProjectPartyDataGrid')
    expect(page).toContain('<ProjectHistoryDataGrid')
    expect(page).not.toContain('<VxDataGrid')
  })

  it('keeps project status and relationship labels in one presentation mapping', () => {
    const mapping = source('projectPresentation.ts')
    const list = source('components/ProjectsDataGrid.tsx')
    const parties = source('components/ProjectPartyDataGrid.tsx')

    expect(mapping).toContain('getProjectStatusLabelKey')
    expect(mapping).toContain('getRelationshipTypeLabelKey')
    expect(list).toContain('getProjectStatusLabelKey')
    expect(parties).toContain('getRelationshipTypeLabelKey')
  })
})
