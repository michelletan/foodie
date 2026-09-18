import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getSettings, listBatches, listRecipes } from '../lib/data/index.js'
import { categoryInfo } from '../lib/mealCategories.js'

// Shown in the app header on every view so a low-stock freezer is never more
// than a glance away. Tracks the freezer's total portions across
// stock-counting batches only — soups/carbs (see mealCategories.js's
// countsTowardStock) are sides, not mains, so they're left out of the sum;
// a recipe with no category set still counts, same as before categories
// existed. The low-stock-threshold setting is "the whole freezer is running
// low", e.g. threshold 5 means show the callout once that total drops to 5
// or fewer. Refetches on every route change (the app has no global store to
// subscribe to) so it clears itself as soon as new stock is made — no
// manual dismiss needed.
export default function LowStockCallout() {
  const location = useLocation()
  const [totalPortions, setTotalPortions] = useState(null)

  useEffect(() => {
    Promise.all([listBatches(), listRecipes(), getSettings()])
      .then(([batches, recipes, settings]) => {
        const recipeById = new Map(recipes.map((r) => [r.id, r]))
        const total = batches.reduce((sum, b) => {
          const category = categoryInfo(recipeById.get(b.recipe_id)?.category)
          if (category && !category.countsTowardStock) return sum
          return sum + b.portions_remaining
        }, 0)
        setTotalPortions(total <= settings.low_stock_threshold ? total : null)
      })
      .catch(() => setTotalPortions(null))
  }, [location.pathname])

  if (totalPortions === null) return null

  return (
    <Link to="/analysis" className="low-stock-callout">
      ⚠️ {totalPortions} portion{totalPortions === 1 ? '' : 's'} left
    </Link>
  )
}
