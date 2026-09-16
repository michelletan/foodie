// Migration script for the 4 recipe PDFs — reuses the same createRecipe()
// used by RecipeForm.jsx, so it targets whichever backend VITE_DATA_BACKEND
// points at (the local browser backend today, or supabaseBackend.js once
// M1 implements it) with no changes needed here. Idempotent: skips any
// title that already exists, so it's safe to re-run.
//
// Run from the browser devtools console while the dev server is running:
//   await importPdfRecipes()
import { createRecipe, listRecipes } from './index.js'
import { PDF_RECIPES } from './pdfRecipes.js'

export async function importPdfRecipes() {
  const existingTitles = new Set((await listRecipes()).map((r) => r.title))
  const imported = []
  const skipped = []

  for (const recipe of PDF_RECIPES) {
    if (existingTitles.has(recipe.title)) {
      skipped.push(recipe.title)
      continue
    }
    await createRecipe(recipe)
    imported.push(recipe.title)
  }

  console.log(`Imported: ${imported.join(', ') || 'none'}`)
  console.log(`Skipped (already exist): ${skipped.join(', ') || 'none'}`)
  return { imported, skipped }
}
