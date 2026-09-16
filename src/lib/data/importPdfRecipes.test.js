import { beforeEach, describe, expect, it } from 'vitest'
import { importPdfRecipes } from './importPdfRecipes.js'
import { listRecipes, resetLocalData } from './localBackend.js'
import { PDF_RECIPES } from './pdfRecipes.js'

beforeEach(() => {
  resetLocalData()
})

describe('importPdfRecipes', () => {
  it('imports all 4 recipes into an empty backend', async () => {
    const result = await importPdfRecipes()

    expect(result.imported).toEqual(PDF_RECIPES.map((r) => r.title))
    expect(result.skipped).toEqual([])
    expect(await listRecipes()).toHaveLength(PDF_RECIPES.length)
  })

  it('is idempotent: re-running skips everything that already exists', async () => {
    await importPdfRecipes()
    const second = await importPdfRecipes()

    expect(second.imported).toEqual([])
    expect(second.skipped).toEqual(PDF_RECIPES.map((r) => r.title))
    expect(await listRecipes()).toHaveLength(PDF_RECIPES.length)
  })
})
